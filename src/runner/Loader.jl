begin
pushfirst!(LOAD_PATH, "@stdlib")
import Pkg
popfirst!(LOAD_PATH)

# We need to Pkg.instantiate the package environment that this notebook worker process will launch in
local my_dir = @__DIR__
local pluto_dir = joinpath(my_dir, "..", "..")

local runner_env_dir = mkpath(joinpath(Pkg.envdir(Pkg.depots()[1]), "__pluto_boot"))
local new_ptoml_path = joinpath(runner_env_dir, "Project.toml")

local ptoml_contents = read(joinpath(pluto_dir, "Project.toml"), String)
write(new_ptoml_path, ptoml_contents[findfirst("[deps]", ptoml_contents)[1]:end])

local pkg_ctx = Pkg.Types.Context(env=Pkg.Types.EnvCache(new_ptoml_path))

try
    Pkg.resolve(pkg_ctx; io=devnull) # supress IO
catch
    # if it failed, do it again without suppressing io
    try
        Pkg.resolve(pkg_ctx)
    catch e
        @error "Failed to resolve notebook boot environment" exception=(e, catch_backtrace())
    end
end
try
    Pkg.instantiate(pkg_ctx) # we don't suppress IO for this one because it can take very long, and that would be a frustrating experience without IO
catch e
    @error "Failed to instantiate notebook boot environment" exception=(e, catch_backtrace())
end


pushfirst!(LOAD_PATH, runner_env_dir)

#
include(joinpath(my_dir, "PlutoRunner.jl"))
#

popfirst!(LOAD_PATH)
end