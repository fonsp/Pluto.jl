module Firebasey end
@testset "Firebasey" begin
    Core.eval(Firebasey, quote
        using Test
        include("../src/webserver/Firebasey.jl")
    end)
end
