using Test

import Pluto.ExpressionExplorer: compute_symbolreferences

@testset "Method signatures" begin


disjoint(x,y) = isempty(x ∩ y)

function mutually_disjoint(x, xs...)
    all(xs) do y
        disjoint(x,y)
    end && mutually_disjoint(xs...)
end
mutually_disjoint(x) = true

function methods_can_coexist(defs::Expr...)
    symstates = compute_symbolreferences.(defs)
    funcnamesigs = [keys(syms.funcdefs) for syms in symstates]
    mutually_disjoint(funcnamesigs...)
end


@testset "Different method signatures across cells" begin
    @test methods_can_coexist(
        :(f(x, y) = 1),
        :(f(x) = 2),
    )
    @test methods_can_coexist(
        :(f(x::A) = 1),
        :(f(x::B) = 2),
    )
    @test methods_can_coexist(
        :(f(x, y=1) = 1),
        :(f(x, y) = 2),
    )
    @test methods_can_coexist(
        :(f(x::e(f{g})=3) = 1),
        :(f(x::h where i) = 2),
    )
    @test methods_can_coexist(
        :(f(x::Tuple{X,T} where T) = 1),
        :(f(x::Tuple{X,T}) = 2),
    )
    @test methods_can_coexist(
        :(f(x::A) where A = 1),
        :(f(x::A) = 2),
    )
    @test methods_can_coexist(
        :(f(x::String, y) = 1),
        :(f(x, y::String) = 2),
    )
    @test methods_can_coexist(
        :(f(x::A) = 1),
        :(f(x::B) = 2),
    )
    @test methods_can_coexist(
        :(f(x, y...) = 1),
        :(f(x) = 2),
    )
    @test methods_can_coexist(
        :(f(x, y::Z...) = 1),
        :(f(x, y::X...) = 2),
    )

    # what is this called again?
    @test methods_can_coexist(
        :(f(x::T) where T = 1),
        :(f(x) = 2),
    )
end

@testset "Identical method signatures across cells" begin
    @test !methods_can_coexist(
        :(f(x) = 3),
        :(f(y) = 3),
    )
    @test !methods_can_coexist(
        :(f(x) = 3),
        :(f(y; z) = 3),
    )
    @test !methods_can_coexist(
        :(f(x) = 3),
        :(f(y::Any) = 3),
    )
    # function using built in type synonyms
    # like Int and Int64
    @assert string(Int) == "Int64" || string(Int) == "Int32"
    @test_broken !methods_can_coexist(
        :(f(x::Int) = 3),
        Meta.parse("f(x::$(string(Int))) = 4"),
    )

    # multiple methods per cell
    @test !methods_can_coexist(
        :(f(x::Int) = 1; f(x::String) = 2),
        :(f(x::String) = 3; f(x::Vector) = 4),
    )

    # methods only differing in key word arguments
    @test !methods_can_coexist(
        :(f() = 1),
        :(f(; x) = 3),
    )
end
end