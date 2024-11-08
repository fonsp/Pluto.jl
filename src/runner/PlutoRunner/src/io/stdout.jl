
function _send_stdio_output!(output, loglevel)
    output_str = String(take!(output))
    if !isempty(output_str)
        Logging.@logmsg loglevel output_str
    end
end

const stdout_log_level = Logging.LogLevel(-555) # https://en.wikipedia.org/wiki/555_timer_IC
const progress_log_level = Logging.LogLevel(-1) # https://github.com/JuliaLogging/ProgressLogging.jl/blob/0e7933005233722d6214b0debe3316c82b4d14a7/src/ProgressLogging.jl#L36
function with_io_to_logs(f::Function; enabled::Bool=true, loglevel::Logging.LogLevel=Logging.LogLevel(1))
    if !enabled
        return f()
    end
    # Taken from https://github.com/JuliaDocs/IOCapture.jl/blob/master/src/IOCapture.jl with some modifications to make it log.

    # Original implementation from Documenter.jl (MIT license)
    # Save the default output streams.
    default_stdout = stdout
    default_stderr = stderr
    # Redirect both the `stdout` and `stderr` streams to a single `Pipe` object.
    pipe = Pipe()
    Base.link_pipe!(pipe; reader_supports_async = true, writer_supports_async = true)
    pe_stdout = IOContext(pipe.in, default_stdout_iocontext)
    pe_stderr = IOContext(pipe.in, default_stdout_iocontext)
    redirect_stdout(pe_stdout)
    redirect_stderr(pe_stderr)

    # Bytes written to the `pipe` are captured in `output` and eventually converted to a
    # `String`. We need to use an asynchronous task to continously tranfer bytes from the
    # pipe to `output` in order to avoid the buffer filling up and stalling write() calls in
    # user code.
    execution_done = Ref(false)
    output = IOBuffer()

    @async begin
        pipe_reader = Base.pipe_reader(pipe)
        try
            while !eof(pipe_reader)
                write(output, readavailable(pipe_reader))

                # NOTE: we don't really have to wait for the end of execution to stream output logs
                #       so maybe we should just enable it?
                if execution_done[]
                    _send_stdio_output!(output, loglevel)
                end
            end
            _send_stdio_output!(output, loglevel)
        catch err
            @error "Failed to redirect stdout/stderr to logs"  exception=(err,catch_backtrace())
            if err isa InterruptException
                rethrow(err)
            end
        end
    end

    # To make the `display` function work.
    redirect_display = TextDisplay(IOContext(pe_stdout, default_display_iocontext))
    pushdisplay(redirect_display)

    # Run the function `f`, capturing all output that it might have generated.
    # Success signals whether the function `f` did or did not throw an exception.
    result = try
        f()
    finally
        # Restore display
        try
            popdisplay(redirect_display)
        catch e
            # This happens when the user calls `popdisplay()`, fine.
            # @warn "Pluto's display was already removed?" e
        end

        execution_done[] = true

        # Restore the original output streams.
        redirect_stdout(default_stdout)
        redirect_stderr(default_stderr)
        close(pe_stdout)
        close(pe_stderr)
    end

    result
end
