import Logging

const original_stdout = stdout
const original_stderr = stderr

const old_logger = Ref{Union{Logging.AbstractLogger,Nothing}}(nothing)

struct PlutoCellLogger <: Logging.AbstractLogger
    stream # some packages expect this field to exist...
    log_channel::Channel{Any}
    cell_id::UUID
    workspace_count::Int # Used to invalidate previous logs
    message_limits::Dict{Any,Int}
end
function PlutoCellLogger(notebook_id, cell_id)
    notebook_log_channel = pluto_log_channels[notebook_id]
    PlutoCellLogger(nothing,
                    notebook_log_channel, cell_id,
                    moduleworkspace_count[],
                    Dict{Any,Int}())
end

struct CaptureLogger <: Logging.AbstractLogger
    stream
    logger::PlutoCellLogger
    logs::Vector{Any}
end

Logging.shouldlog(cl::CaptureLogger, args...) = Logging.shouldlog(cl.logger, args...)
Logging.min_enabled_level(cl::CaptureLogger) = Logging.min_enabled_level(cl.logger)
Logging.catch_exceptions(cl::CaptureLogger) = Logging.catch_exceptions(cl.logger)
function Logging.handle_message(cl::CaptureLogger, level, msg, _module, group, id, file, line; kwargs...)
    push!(cl.logs, (level, msg, _module, group, id, file, line, kwargs))
end


const pluto_cell_loggers = Dict{UUID,PlutoCellLogger}() # One logger per cell
const pluto_log_channels = Dict{UUID,Channel{Any}}() # One channel per notebook

function get_cell_logger(notebook_id, cell_id)
    logger = get!(() -> PlutoCellLogger(notebook_id, cell_id), pluto_cell_loggers, cell_id)
    if logger.workspace_count < moduleworkspace_count[]
        logger = pluto_cell_loggers[cell_id] = PlutoCellLogger(notebook_id, cell_id)
    end
    logger
end

function Logging.shouldlog(logger::PlutoCellLogger, level, _module, _...)
    # Accept logs
    # - Only if the logger is the latest for this cell using the increasing workspace_count tied to each logger
    # - From the user's workspace module
    # - Info level and above for other modules
    # - LogLevel(-1) because that's what ProgressLogging.jl uses for its messages
    current_logger = pluto_cell_loggers[logger.cell_id]
    if current_logger.workspace_count > logger.workspace_count
        return false
    end

    level = convert(Logging.LogLevel, level)
    (_module isa Module && is_pluto_workspace(_module)) ||
        level >= Logging.Info ||
        level == progress_log_level ||
        level == stdout_log_level
end

const BuiltinInts = @static isdefined(Core, :BuiltinInts) ? Core.BuiltinInts : Union{Bool, Int32, Int64, UInt32, UInt64, UInt8, Int128, Int16, Int8, UInt128, UInt16}

Logging.min_enabled_level(::PlutoCellLogger) = min(Logging.Debug, stdout_log_level)
Logging.catch_exceptions(::PlutoCellLogger) = false
function Logging.handle_message(pl::PlutoCellLogger, level, msg, _module, group, id, file, line; kwargs...)
    # println("receiving msg from ", _module, " ", group, " ", id, " ", msg, " ", level, " ", line, " ", file)
    # println("with types: ", "_module: ", typeof(_module), ", ", "msg: ", typeof(msg), ", ", "group: ", typeof(group), ", ", "id: ", typeof(id), ", ", "file: ", typeof(file), ", ", "line: ", typeof(line), ", ", "kwargs: ", typeof(kwargs)) # thanks Copilot

    # https://github.com/JuliaLang/julia/blob/eb2e9687d0ac694d0aa25434b30396ee2cfa5cd3/stdlib/Logging/src/ConsoleLogger.jl#L110-L115
    if get(kwargs, :maxlog, nothing) isa BuiltinInts
        maxlog = kwargs[:maxlog]
        remaining = get!(pl.message_limits, id, Int(maxlog)::Int)
        pl.message_limits[id] = remaining - 1
        if remaining <= 0
            return
        end
    end

    try
        yield()

        po() = get(cell_published_objects, pl.cell_id, Dict{String,Any}())
        before_published_object_keys = collect(keys(po()))

        # Render the log arguments:
        msg_formatted = format_output_default(msg isa AbstractString ? Text(msg) : msg)
        kwargs_formatted = Tuple{String,Any}[(string(k), format_log_value(v)) for (k, v) in kwargs if k != :maxlog]

        after_published_object_keys = collect(keys(po()))
        new_published_object_keys = setdiff(after_published_object_keys, before_published_object_keys)

        # (Running `put!(pl.log_channel, x)` will send `x` to the pluto server. See `start_relaying_logs` for the receiving end.)
        put!(pl.log_channel, Dict{String,Any}(
            "level" => string(level),
            "msg" => msg_formatted,
            # This is a dictionary containing all published objects that were published during the rendering of the log arguments (we cannot track which objects were published during the execution of the log statement itself i think...)
            "new_published_objects" => Dict{String,Any}(
                key => po()[key] for key in new_published_object_keys
            ),
            "group" => string(group),
            "id" => string(id),
            "file" => string(file),
            "cell_id" => pl.cell_id,
            "line" => line isa Union{Int32,Int64} ? line : nothing,
            "kwargs" => kwargs_formatted,
        ))

        yield()

    catch e
        println(original_stderr, "Failed to relay log from PlutoRunner")
        showerror(original_stderr, e, stacktrace(catch_backtrace()))

        nothing
    end
end

format_log_value(v) = format_output_default(v)
format_log_value(v::Tuple{<:Exception,Vector{<:Any}}) = format_output(CapturedException(v...))

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

function with_logger_and_io_to_logs(f, logger; capture_stdout=true, stdio_loglevel=stdout_log_level)
    Logging.with_logger(logger) do
        with_io_to_logs(f; enabled=capture_stdout, loglevel=stdio_loglevel)
    end
end

function setup_plutologger(notebook_id::UUID, log_channel::Channel{Any})
    pluto_log_channels[notebook_id] = log_channel
end
