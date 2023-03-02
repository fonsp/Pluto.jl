


function instantiate_isolated(environment::String; generate_pkgimages::Bool=true)
    flags = Configuration._convert_to_flags(Configuration.CompilerOptions(; 
        pkgimages=generate_pkgimages, 
        optimize=0, # tiny speedup
    ))
    
    code = """
        using Pkg
        Pkg.activate($(repr(environment)))
        Pkg.precompile()
    """
    
    cmd = `$(Base.julia_cmd()) $(flags) -e $(code)`
end



