function precompile_isolated(
    environment::String; 
    compiler_options::Configuration.CompilerOptions=Configuration.CompilerOptions(),
    io::IO,
)
    flags = Configuration._convert_to_flags(compiler_options)
    
    code = """
    # import Pkg with safe load path
    pushfirst!(LOAD_PATH, "@stdlib")
    import Pkg
    popfirst!(LOAD_PATH)
    
    out_stream = IOContext(stdout, :color => true)
    # I'm a pirate harrr 🏴‍☠️
    @static if isdefined(Pkg, :can_fancyprint)
        Pkg.can_fancyprint(io::IO) = true
    end
    @static if isdefined(Base, :Precompilation) && isdefined(Base.Precompilation, :can_fancyprint)
        Base.Precompilation.can_fancyprint(io::IO) = true
    end
    
    Pkg.activate($(repr(environment)); io=out_stream)
    Pkg.precompile(; already_instantiated=true, io=out_stream)
    """

    cmd = `$(Base.julia_cmd()[1]) $(flags) -e $(code)`
    
    stderr_buffer = IOBuffer()
    stderr_capture = tee_io(stderr, stderr_buffer) # not to io because any stderr content will be shown eventually by the `error`.

    try
        Base.run(pipeline(
            cmd; stdout=io, stderr=stderr_capture.io,
        ))
    catch e
        if e isa ProcessFailedException
            throw(PrecompilationFailedException("Precompilation failed\n\n$(String(take!(stderr_buffer)))"))
        else
            rethrow(e)
        end
    finally
        stderr_capture.close()
    end
    
    # In the future we could allow interrupting the precompilation process (e.g. when the notebook is shut down)
    # by running this code using Malt.jl
end

struct PrecompilationFailedException <: Exception
    msg::String
end

# Create a new IO object that redirects all writes to the given capture IOs. It's like the `tee` linux command. Return a named tuple with the IO object and a function to close it which you should not forget to call.
function tee_io(captures...)
	bs = Base.BufferStream()

	t = @async begin
		while !eof(bs)
			data = readavailable(bs)
			isempty(data) && continue

			for s in captures
				write(s, data)
			end
		end
	end

	function closeme()
		close(bs)
		wait(t)
	end

	return (io=bs, close=closeme)
end
