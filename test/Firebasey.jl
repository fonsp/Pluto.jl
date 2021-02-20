module FirebaseyTestPlace end
@testset "Firebasey" begin
    Core.eval(FirebaseyTestPlace, quote
        using Test
        include("../src/webserver/Firebasey.jl")
    end)
end
