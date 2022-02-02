# The goal of this file is to import PlutoRunner into Main. 
# 
# This is difficult because PlutoRunner uses standard libraries and packages that are not necessarily available in the standard environment. 
# 
# Our solution is to create a temporary environment just for loading PlutoRunner. This environment is stored in `.julia/environments/__pluto_book_v*_*/`, and used by all notebook launches. Reusing the environment means extra speed.

begin
    pushfirst!(LOAD_PATH, "@stdlib")    
    import Pkg
    popfirst!(LOAD_PATH)


    # Path to our notebook boot package environment
    local runner_env_dir = mkpath(joinpath(Pkg.envdir(Pkg.depots()[1]), "__pluto_boot_v3_" * string(VERSION)))

    local original_LP = LOAD_PATH
    local original_AP = Base.ACTIVE_PROJECT[]

    local new_LP = ["@", "@stdlib"]
    local new_AP = runner_env_dir

    try
        
        # Activate the environment
        copy!(LOAD_PATH, new_LP)
        Base.ACTIVE_PROJECT[] = new_AP
        
        # Set up our notebook boot package environment by adding a single package:
        Pkg.develop([Pkg.PackageSpec(; 
            path=joinpath(@__DIR__, "PlutoRunner"),
        )]; io=devnull)
        
        # Resolve
        try
            Pkg.resolve(; io=devnull) # supress IO
        catch
            # if it failed, do it again without suppressing io
            try
                Pkg.resolve()
            catch e
                @error "Failed to resolve notebook boot environment" exception=(e, catch_backtrace())
            end
        end
        
        # Instantiate
        try
            # we don't suppress IO for this one because it can take very long, and that would be a frustrating experience without IO
            if VERSION >= v"1.6.0-a"
                # precompilation switched off because of https://github.com/fonsp/Pluto.jl/issues/875
                Pkg.instantiate(; update_registry=false, allow_autoprecomp=false) 
            elseif VERSION >= v"1.3.0"
                # registry update is not required here (because you were able to install Pluto) and may save some time for startup
                Pkg.instantiate(; update_registry=false)
            else
                Pkg.instantiate()
            end
        catch e
            @error "Failed to instantiate notebook boot environment" exception=(e, catch_backtrace())
        end
        
        # Import PlutoRunner into Main
        import PlutoRunner
        
    finally
        # Reset the pkg environment
        copy!(LOAD_PATH, original_LP)
        Base.ACTIVE_PROJECT[] = original_AP
    end
end
