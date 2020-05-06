using Test

@testset "Explore Expressions" begin
    @testset "Basics" begin
        @test testee(:(a), [:a], [], [], [])
        @test testee(:(1 + 1), [], [], [:+], [])
        @test testee(:(x = 3), [], [:x], [], [])
        @test testee(:(x = x), [:x], [:x], [], [])
        @test testee(:(x = 1 + y), [:y], [:x], [:+], [])
        @test testee(:(x = +(a...)), [:a], [:x], [:+], [])

        @test_nowarn testee(:(x::Int64 = 3), [], [:x, :Int64], [], [], verbose=false)
    end
    @testset "Bad code" begin
        # @test_nowarn testee(:(begin end = 2), [:+], [], [:+], [], verbose=false)
        @test_nowarn testee(:(function f(function g() end) end), [], [], [:+], [], verbose=false)
        @test_nowarn testee(:(function f() Base.sqrt(x::String) = 2; end), [], [], [:+], [], verbose=false)
        @test_nowarn testee(:(function f() global g(x) = x; end), [], [], [], [], verbose=false)
    end
    @testset "Lists and structs" begin
        @test testee(:(1:3), [], [], [:(:)], [])
        @test testee(:(a[1:3,4]), [:a], [], [:(:)], [])
        @test testee(:([a[1:3,4]; b[5]]), [:b, :a], [], [:(:)], [])
        @test testee(:(a.property), [:a], [], [], []) # `a` can also be a module
        @test testee(:(struct a; b; c; end), [], [], [], [
            :a => ([], [], [], [])
            ])

        @test_nowarn testee(:(struct a <: b; c; d::Int64; end), [:b, :Int64], [:a], [], [], verbose=false)
        @test testee(:(module a; f(x) = x; z = r end), [], [:a], [], [])

    end
    @testset "Assignment operator & modifiers" begin
        # https://github.com/JuliaLang/julia/blob/f449765943ba414bd57c3d1a44a73e5a0bb27534/base/docs/basedocs.jl#L239-L244
        @test testee(:(a = a + 1), [:a], [:a], [:+], [])
        @test testee(:(x = a = a + 1), [:a], [:a, :x], [:+], [])
        @test testee(:(f(x) = x), [], [], [], [:f => ([], [], [], [])])
        @test testee(:(a[b,c,:] = d), [:a, :b, :c, :d, :(:)], [], [], [])
        @test testee(:(a.b = c), [:a, :c], [], [], [])
        @test testee(:(f(a,b=c, d=e; f=g)), [:a, :c, :e, :g], [], [:f], [])
        
        @test testee(:(a += 1), [:a], [:a], [:+], [])
        @test testee(:(a[1] += 1), [:a], [], [:+], [])
        @test testee(:(x = let a = 1; a += b end), [:b], [:x], [:+], [])
    end
    @testset "Tuples" begin
        @test testee(:((a,b,)), [:a,:b], [], [], [])
        @test testee(:((a=b,c=2,d=123,)), [:b], [], [], [])
        @test_nowarn testee(:((a=b,c,d=123,)), [:b], [], [], [], verbose=false)
        @test_nowarn testee(:((a=b,c[r]=2,d=123,)), [:b], [], [], [], verbose=false)
        @test testee(:(a, b = 1, 2), [], [:a, :b], [], [])
        @test testee(:((a, b) = 1, 2), [], [:a, :b], [], [])
        @test testee(:(a = b, c), [:b, :c], [:a], [], [])
        @test testee(:(a, b = c), [:c], [:a, :b], [], [])
        @test testee(:(a = (b, c)), [:b, :c], [:a], [], [])
        @test testee(:(a, (b,c) = [e,[f,g]]), [:e, :f, :g], [:a, :b, :c], [], [])
        @test testee(:((x,y), a, (b,c) = z, e, (f,g)), [:z, :e, :f, :g], [:x, :y, :a, :b, :c], [], [])
        @test testee(:((x[i], y.r), a, (b,c) = z, e, (f,g)), [:x, :i, :y, :z, :e, :f, :g], [:a, :b, :c], [], [])
        @test testee(:((a[i], b.r) = (c.d, 2)), [:a, :b, :i, :c], [], [], [])
        
    end
    @testset "Dot operator" begin
        @test testee(:(a .= b), [:b, :a], [], [], []) # modifies elements, doesn't set `a`
        @test testee(:(a .+= b), [:b, :a], [], [:+], [])
        @test testee(:(a[i] .+= b), [:b, :a, :i], [], [:+], [])
        @test testee(:(a .+ b ./ sqrt.(c, d)), [:a, :b, :c, :d], [], [:+, :/, :sqrt], [])
    end
    @testset "`for` & `while`" begin
        @test testee(:(for k in 1:n; k + s; end), [:n, :s], [], [:+, :(:)], [])
        @test testee(:(for k in 1:2, r in 3:4; global z = k + r; end), [], [:z], [:+, :(:)], [])
        @test testee(:(while k < 2; r = w; global z = k + r; end), [:k, :w], [:z], [:+, :(<)], [])
    end
    @testset "Comprehensions" begin
        @test testee(:([sqrt(s) for s in 1:n]), [:n], [], [:sqrt, :(:)], [])
        @test testee(:([s + j + r + m for s in 1:3 for j in 4:5 for (r, l) in [(1, 2)]]), [:m], [], [:+, :(:)], [])

        @test_nowarn testee(:([a for a in a]), [:a], [], [], [], verbose=false)
        @test_nowarn testee(:(a = [a for a in a]), [:a], [:a], [], [], verbose=false)
    end
    @testset "Multiple expressions" begin
        @test testee(:(x = let r = 1; r + r end), [], [:x], [:+], [])
        @test testee(:(begin let r = 1; r + r end; r = 2 end), [], [:r], [:+], [])
        @test testee(:((k = 2; 123)), [], [:k], [], [])
        @test testee(:((a = 1; b = a + 1)), [], [:a, :b], [:+], [])
        @test testee(Meta.parse("a = 1; b = a + 1"), [], [:a, :b], [:+], [])
        @test testee(:((a = b = 1)), [], [:a, :b], [], [])
        @test testee(:(let k = 2; 123 end), [], [], [], [])
        @test testee(:(let k() = 2 end), [], [], [], [])

        @test_nowarn testee(:(a::Int64, b::String = 1, "2"), [:Int64, :String], [:a, :b], [], [], verbose=false)
    end
    @testset "Functions" begin
        @test testee(:(function g() r = 2; r end), [], [], [], [
            :g => ([], [], [], [])
        ])
        @test testee(:(function f() g(x) = x; end), [], [], [], [
            :f => ([], [], [], []) # g is not a global def
        ])
        @test testee(:(function f(x, y = 1; r, s = 3 + 3) r + s + x * y * z end), [], [], [], [
            :f => ([:z], [], [:+, :*], [])
        ])
        @test testee(:(function f(x) x * y * z end), [], [], [], [
            :f => ([:y, :z], [], [:*], [])
        ])
        @test testee(:(function f(x) x = x / 3; x end), [], [], [], [
            :f => ([], [], [:/], [])
        ])
        @test testee(:(function f(x) a end; function f(x, y) b end), [], [], [], [
            :f => ([:a, :b], [], [], [])
        ])
        @test testee(:(f(x, y = a + 1) = x * y * z), [], [], [], [
            :f => ([:z], [], [:*], [])
        ])
        @test testee(:(begin
                f(x) = (global a = √b)
                f(x,y) = (global c = -d)
            end), [], [], [], [
            :f => ([:b, :d], [:a, :c], [:√, :-], [])
        ])
        @test testee(:(Base.show() = 0), [:Base], [], [], [
            [:Base, :show] => ([], [], [], [])
        ])
        @test testee(:(minimum(x) do (a, b); a + b end), [:x], [], [:minimum], [
            :anon => ([], [], [:+], [])
        ])
        @test testee(:(f = x->x * y), [], [:f], [], [
            :anon => ([:y], [], [:*], [])
        ])
        @test testee(:(f = (x, y)->x * y), [], [:f], [], [
            :anon => ([], [], [:*], [])
        ])
        @test testee(:(f = (x, y = a + 1)->x * y), [], [:f], [], [
            :anon => ([], [], [:*], [])
        ])
        @test testee(:((((a, b), c), (d, e))->a * b * c * d * e * f), [], [], [], [
            :anon => ([:f], [], [:*], [])
        ])

        @test testee(:(func(b)), [:b], [], [:func], [])
        @test testee(:(√ b), [:b], [], [:√], [])
        @test testee(:(funcs[i](b)), [:funcs, :i, :b], [], [], [])
        @test testee(:(f(a)(b)), [:a, :b], [], [:f], [])
        @test testee(:(a.b(c)), [:a, :c], [], [[:a,:b]], [])
        @test testee(:(a.b.c(d)), [:b, :d], [], [[:a,:b,:c]], []) # only referencing :b, and not :a, matches the behaviour of `import a.b`
            
        @test_nowarn testee(:(function f(y::Int64 = a)::String string(y) end), [], [], [], [], verbose=false)
        @test_nowarn testee(:(function f(x::T; k = 1) where T return x + 1 end), [], [], [], [], verbose=false)
        @test_nowarn testee(:(function f(x::T; k = 1) where {T,S<:R} return x + 1 end), [:R], [:f], [], [
            :f => ([], [], [], [])
        ], verbose=false)
        @test_nowarn testee(:(function f(::MIME"text/html") 1 end), [], [], [], [], verbose=false)
    end
    @testset "Scope modifiers" begin
        @test testee(:(let global a, b = 1, 2 end), [], [:a, :b], [], [])
        @test testee(:(let global k = 3 end), [], [:k], [], [])
        @test testee(:(let global k += 3 end), [:k], [:k], [:+], [])
        @test testee(:(let global k; k = 4 end), [], [:k], [], [])
        @test testee(:(let global k; b = 5 end), [], [], [], [])

        @test testee(:(begin local a, b = 1, 2 end), [], [], [], [])
        @test testee(:(begin local k = 3 end), [], [], [], [])
        @test testee(:(begin local k += 3 end), [], [], [:+], [])
        @test testee(:(begin local k; k = 4 end), [], [], [], [])
        @test testee(:(begin local k; b = 5 end), [], [:b], [], [])
        
        @test testee(:(function f(x) global k = x end), [], [], [], [
            :f => ([], [:k], [], [])
        ])
        @test testee(:((begin x = 1 end, y)), [:y], [:x], [], [])
        @test testee(:(x = let global a += 1 end), [:a], [:x, :a], [:+], [])
    end
    @testset "`import` & `using`" begin
        @test testee(:(using Plots), [], [:Plots], [], [])
        @test testee(:(using Plots.ExploreExpression), [], [:ExploreExpression], [], [])
        @test testee(:(using JSON, UUIDs), [], [:JSON, :UUIDs], [], [])
        @test testee(:(import Pluto), [], [:Pluto], [], [])
        @test testee(:(import Pluto: wow, wowie), [], [:wow, :wowie], [], [])
        @test testee(:(import Pluto.ExploreExpression.wow, Plutowie), [], [:wow, :Plutowie], [], [])
        @test testee(:(import .Pluto: wow), [], [:wow], [], [])
        @test testee(:(import ..Pluto: wow), [], [:wow], [], [])
    end
    @testset "Macros" begin
        @test testee(:(@time a = 2), [Symbol("@time")], [:a], [], [])
        @test testee(:(html"a $(b = c)"), [Symbol("@html_str")], [], [], [])
        @test testee(:(md"a $(b = c)"), [Symbol("@md_str"), :c], [:b], [], [])
        @test testee(:(md"a \$(b = c)"), [Symbol("@md_str")], [], [], [])
    end
    @testset "String interpolation" begin
        @test testee(:("a $b"), [:b], [], [], [])
        @test testee(:("a $(b = c)"), [:c], [:b], [], [])
    end
end