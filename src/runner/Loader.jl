const my_dir = @__DIR__
const pluto_dir = joinpath(my_dir, "..", "..")

pushfirst!(LOAD_PATH, pluto_dir)

#
include(joinpath(my_dir, "PlutoRunner.jl"))
#

let
    i = findfirst(isequal(pluto_dir), LOAD_PATH)
    if i !== nothing
        deleteat!(LOAD_PATH, i)
    end
end