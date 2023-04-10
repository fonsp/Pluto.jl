


function precompile_isolated(
    environment::String; 
    compiler_options::Configuration.CompilerOptions=Configuration.CompilerOptions(),
    io::IO,
)
    flags = Configuration._convert_to_flags(compiler_options)
    
    code = """
    # Add some color
    redirect_stdout(IOContext(stdout, :color => true))
    redirect_stderr(IOContext(stderr, :color => true))
    
    # import Pkg with safe load path
    pushfirst!(LOAD_PATH, "@stdlib")
    import Pkg
    popfirst!(LOAD_PATH)
    
    Pkg.activate($(repr(environment)))
    if hasmethod(Pkg.precompile, Tuple{}, (:already_instantiated, ))
        Pkg.precompile(; already_instantiated=true)
    else
        Pkg.precompile()
    end
    """

    cmd = `$(Base.julia_cmd()[1]) $(flags) -e $(code)`

    Base.run(pipeline(
        cmd; stdout=io, stderr=io,
    ))
    
    # In the future we could allow interrupting the precompilation process (e.g. when the notebook is shut down)
    # by running this code using Malt.jl
end



