begin
pushfirst!(LOAD_PATH, "@stdlib")
import Pkg
popfirst!(LOAD_PATH)

# We need to Pkg.instantiate the package environment that this notebook worker process will launch in
local my_dir = @__DIR__
local pluto_dir = joinpath(my_dir, "..", "..")

local runner_env_dir = mktempdir()
local new_ptoml_path = joinpath(runner_env_dir, "Project.toml")

local ptoml_contents = read(joinpath(pluto_dir, "Project.toml"), String)
write(new_ptoml_path, ptoml_contents[findfirst("[deps]", ptoml_contents)[1]:end])

local pkg_ctx = Pkg.Types.Context(env=Pkg.Types.EnvCache(new_ptoml_path))
Pkg.instantiate(pkg_ctx)


pushfirst!(LOAD_PATH, runner_env_dir)

#
include(joinpath(my_dir, "PlutoRunner.jl"))
#

popfirst!(LOAD_PATH)
end