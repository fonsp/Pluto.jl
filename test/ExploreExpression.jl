using Test
using Pluto
import Pluto.ExploreExpression: SymbolsState, compute_symbolreferences

verbose = true

function testee(expr, ref, def)
    expected = SymbolsState(Set(ref), Set(def))
    result = compute_symbolreferences(expr)
    if verbose && expected != result
        println()
        println("FAILED TEST")
        println(expr)
        println()
        dump(expr, maxdepth = 20)
        println()
        @show expected
        @show result
        println()
    end
    return expected == result
end

@testset "Explore Expressions" begin
    @testset "Basics" begin
        @test testee(:(a), [:a], [])
        @test testee(:(1 + 1), [:+], [])
        @test testee(:(x = 3), [], [:x])
        @test testee(:(x = x), [:x], [:x])
        @test testee(:(x = 1 + y), [:+, :y], [:x])
        @test testee(:(x = +(a...)), [:+, :a], [:x])

        @test testee(:(1:3), [:(:)], [])
        @test testee(:(a[1:3,4]), [:a, :(:)], [])
        @test testee(:(a[1:3,4] = b[5]), [:b], [])
        @test testee(:(a.property), [:a], [])
        @test testee(:(a.property = 1), [], [])
    
        @test testee(:(a += 1), [:a, :(+)], [:a])
        @test testee(:(a[1] += 1), [:a, :(+)], [])
        @test testee(:(x = let a = 1; a += b end), [:(+), :b], [:x])
        
        @test testee(:(minimum(x) do (a, b); a + b end), [:(+), :x, :minimum], [])
        @test testee(:(for k in 1:n; k + s; end), [:n, :s, :+, :(:)], [])
        @test testee(:(for k in 1:2, r in 3:4; global z = k + r; end), [:+, :(:)], [:z])
        @test testee(:([sqrt(s) for s in 1:n]), [:sqrt, :n, :(:)], [])
        @test testee(:([s + j + r + m for s in 1:3 for j in 4:5 for (r, l) in [(1, 2)]]), [:+, :m, :(:)], [])
        # @test testee(:([a for a in a]), [:a], [])
        # @test testee(:(a = [a for a in a]), [:a], [:a])

        @test testee(:("a $(b = c)"), [:c], [:b])
    end
    @testset "Multiple expressions" begin
        @test testee(:(x = let r = 1; r + r end), [:+], [:x])
        @test testee(:(begin let r = 1; r + r end; r = 2 end), [:+], [:r])
        @test testee(:(a, b = 1, 2), [], [:a, :b])
        @test testee(:((k = 2; 123)), [], [:k])
        @test testee(:((a = 1; b = a + 1)), [:+], [:a, :b])
        @test testee(:(let k = 2; 123 end), [], [])
    end
    @testset "Functions" begin
        @test testee(:(f = x->x * y), [:y, :*], [:f])
        @test testee(:(f = (x, y)->x * y), [:*], [:f])
        @test testee(:(f(x, y = a + 1) = x * y * z), [:*, :z], [:f])
        @test testee(:((((a, b), c), (d, e))->a * b * c * d * e * f), [:*, :f], [])
        @test testee(:(f = (x, y = a + 1)->x * y), [:*], [:f])
        @test testee(:(function g() r = 2; r end), [], [:g])
        @test testee(:(function f(x, y = 1; r, s = 3 + 3) r + s + x * y * z end), [:z, :+, :*], [:f])
        @test testee(:(function f(x, y = a; r, s = b) r + s + x * y * z end), [:z, :+, :*], [:f])
        @test testee(:(function f(x) x * y * z end), [:y, :z, :*], [:f])
        # @test testee(:(function f(x::T; k = 1) where T return x+1 end), [:+], [:f])
    end
    @testset "Global exposure" begin
        @test testee(:(let global a, b = 1, 2 end), [], [:a, :b])
        @test testee(:(let global k = 3; 123 end), [], [:k])
        @test testee(:(let global k; k = 2123 end), [], [:k])
        @test testee(:(let global a; b = 1 end), [], [])
        @test testee(:(function f(x) global k = x end), [], [:k, :f])
        @test testee(:((begin x = 1 end, y)), [:y], [:x])
        @test testee(:(x = let global a += 1 end), [:(+), :a], [:x, :a])
    end
    @testset "import/using" begin
        @test testee(:(using Plots), [], [:Plots])
        @test testee(:(using JSON, UUIDs), [], [:JSON, :UUIDs])
        @test testee(:(import Pluto), [], [:Pluto])
        @test testee(:(import Pluto: wow, wowie), [], [:wow, :wowie])
    end
    @testset "Macros" begin
        @test testee(:(@time a = 2), [Symbol("@time")], [:a])
        @test testee(:(html"a $(b = c)"), [Symbol("@html_str")], [])
        @test testee(:(md"a $(b = c)"), [Symbol("@md_str"), :c], [:b])
        @test testee(:(md"a \$(b = c)"), [Symbol("@md_str")], [])
        # @test testee(:(), [], [])
    end
end