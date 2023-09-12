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
    
    Pkg.activate($(repr(environment)); io=out_stream)
    if VERSION >= v"1.8.0" # https://github.com/JuliaLang/Pkg.jl/pull/2816
        Pkg.precompile(; already_instantiated=true, io=out_stream)
    else
        Pkg.precompile(; io=out_stream)
    end
    """

    cmd = `$(Base.julia_cmd()[1]) $(flags) -e $(code)`

    Base.run(pipeline(
        cmd; stdout=io, #dont capture stderr because we want it to show in the server terminal when something goes wrong
    ))
    
    # In the future we could allow interrupting the precompilation process (e.g. when the notebook is shut down)
    # by running this code using Malt.jl
end
