module FirebaseyTestPlace end
@testset "Firebasey" begin
    Core.eval(FirebaseyTestPlace, quote
        using Test
        include("../src/webserver/Firebasey.jl")
    end)
end

module DataUrlTestPlace end
@testset "DataUrl" begin
    Core.eval(DataUrlTestPlace, quote
        using Test
        include("../src/webserver/data_url.jl")
    end)
end
