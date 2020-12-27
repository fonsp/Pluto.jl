begin
local my_dir = @__DIR__
local pluto_dir = joinpath(my_dir, "..", "..")
local runner_env_dir = mktempdir()

write(joinpath(runner_env_dir, "Project.toml"), read(joinpath(pluto_dir, "Project.toml")))

pushfirst!(LOAD_PATH, runner_env_dir)

#
include(joinpath(my_dir, "PlutoRunner.jl"))
#

setdiff!(LOAD_PATH, [runner_env_dir])
end