using Test

@testset "Explore Expressions" begin
    @testset "Basics" begin
        @test testee(:(a), [:a], [], [], [])
        @test testee(:(1 + 1), [], [], [:+], [])
        @test testee(:(sqrt(1)), [], [], [:sqrt], [])
        @test testee(:(x = 3), [], [:x], [], [])
        @test testee(:(x = x), [:x], [:x], [], [])
        @test testee(:(x = 1 + y), [:y], [:x], [:+], [])
        @test testee(:(x = +(a...)), [:a], [:x], [:+], [])
        @test testee(:(1:3), [], [], [:(:)], [])
    end
    @testset "Bad code" begin
        # @test_nowarn testee(:(begin end = 2), [:+], [], [:+], [], verbose=false)
        @test_nowarn testee(:((a = b, c, d = 123,)), [:b], [], [], [], verbose=false)
        @test_nowarn testee(:((a = b, c[r] = 2, d = 123,)), [:b], [], [], [], verbose=false)

        @test_nowarn testee(:(function f(function g() end) end), [], [], [:+], [], verbose=false)
        @test_nowarn testee(:(function f() Base.sqrt(x::String) = 2; end), [], [], [:+], [], verbose=false)
        @test_nowarn testee(:(function f() global g(x) = x; end), [], [], [], [], verbose=false)
    end
    @testset "Lists and structs" begin
        @test testee(:(1:3), [], [], [:(:)], [])
        @test testee(:(a[1:3,4]), [:a], [], [:(:)], [])
        @test testee(:(a[b]), [:a, :b], [], [], [])
        @test testee(:([a[1:3,4]; b[5]]), [:b, :a], [], [:(:)], [])
        @test testee(:(a.someproperty), [:a], [], [], []) # `a` can also be a module
        @test testee(:([a..., b]), [:a, :b], [], [], [])
        @test testee(:(struct a; b; c; end), [], [:a], [], [
            :a => ([], [], [], [])
            ])
        @test testee(:(let struct a; b; c; end end), [], [:a], [], [
            :a => ([], [], [], [])
            ])

        @test testee(:(module a; f(x) = x; z = r end), [], [:a], [], [])
    end
    @testset "Types" begin
        @test testee(:(x::Foo = 3), [:Foo], [:x], [], [])
        @test testee(:(x::Foo), [:x, :Foo], [], [], [])
        @test testee(:(a::Foo, b::String = 1, "2"), [:Foo, :String], [:a, :b], [], [])
        @test testee(:(Foo[]), [:Foo], [], [], [])
        @test testee(:(x isa Foo), [:x, :Foo], [], [:isa], [])

        @test testee(:(A{B} = B), [], [:A], [], [])
        @test testee(:(A{T} = Union{T,Int}), [:Int, :Union], [:A], [], [])

        @test testee(:(abstract type a end), [], [:a], [], [:a => ([], [], [], [])])
        @test testee(:(abstract type a <: b end), [], [:a], [], [:a => ([:b], [], [], [])])
        @test testee(:(abstract type a <: b{C} end), [], [:a], [], [:a => ([:b, :C], [], [], [])])
        @test testee(:(abstract type a{T} end), [], [:a], [], [:a => ([], [], [], [])])
        @test testee(:(abstract type a{T,S} end), [], [:a], [], [:a => ([], [], [], [])])
        @test testee(:(abstract type a{T} <: b end), [], [:a], [], [:a => ([:b], [], [], [])])
        @test testee(:(abstract type a{T} <: b{T} end), [], [:a], [], [:a => ([:b], [], [], [])])
        @test_nowarn testee(macroexpand(Main, :(@enum a b c)), [], [], [], []; verbose=false)
        
        e = :(struct a end) # needs to be on its own line to create LineNumberNode
        @test testee(e, [], [:a], [], [:a => ([], [], [], [])])
        @test testee(:(struct a <: b; c; d::Foo; end), [], [:a], [], [:a => ([:b, :Foo], [], [], [])])
        @test testee(:(struct a{T,S}; c::T; d::Foo; end), [], [:a], [], [:a => ([:Foo], [], [], [])])
        @test testee(:(struct a{T} <: b; c; d::Foo; end), [], [:a], [], [:a => ([:b, :Foo], [], [], [])])
        @test testee(:(struct a{T} <: b{T}; c; d::Foo; end), [], [:a], [], [:a => ([:b, :Foo], [], [], [])])
        @test testee(:(struct a; c; a(x=y) = new(x, z); end), [], [:a], [], [:a => ([:y, :z], [], [:new], [])])
        # @test_broken testee(:(struct a; c; a(x=y) = new(x,z); end), [], [:a], [], [:a => ([:y, :z], [], [], [])], verbose=false)
    end
    @testset "Assignment operator & modifiers" begin
        # https://github.com/JuliaLang/julia/blob/f449765943ba414bd57c3d1a44a73e5a0bb27534/base/docs/basedocs.jl#L239-L244
        @test testee(:(a = a), [:a], [:a], [], [])
        @test testee(:(a = a + 1), [:a], [:a], [:+], [])
        @test testee(:(x = a = a + 1), [:a], [:a, :x], [:+], [])
        @test testee(:(const a = b), [:b], [:a], [], [])
        @test testee(:(f(x) = x), [], [], [], [:f => ([], [], [], [])])
        @test testee(:(a[b,c,:] = d), [:a, :b, :c, :d, :(:)], [], [], [])
        @test testee(:(a.b = c), [:a, :c], [], [], [])
        @test testee(:(f(a, b=c, d=e; f=g)), [:a, :c, :e, :g], [], [:f], [])
        
        @test testee(:(a += 1), [:a], [:a], [:+], [])
        @test testee(:(a >>>= 1), [:a], [:a], [:>>>], [])
        @test testee(:(a ⊻= 1), [:a], [:a], [:⊻], [])
        @test testee(:(a[1] += 1), [:a], [], [:+], [])
        @test testee(:(x = let a = 1; a += b end), [:b], [:x], [:+], [])
    end
    @testset "Tuples" begin
        @test testee(:((a, b,)), [:a,:b], [], [], [])
        @test testee(:((a = b, c = 2, d = 123,)), [:b], [], [], [])
        @test testee(:((a = b,)), [:b], [], [], [])
        @test testee(:(a, b = 1, 2), [], [:a, :b], [], [])
        @test testee(:(const a, b = 1, 2), [], [:a, :b], [], [])
        @test testee(:((a, b) = 1, 2), [], [:a, :b], [], [])
        @test testee(:(a = b, c), [:b, :c], [:a], [], [])
        @test testee(:(a, b = c), [:c], [:a, :b], [], [])
        @test testee(:(a = (b, c)), [:b, :c], [:a], [], [])
        @test testee(:(a, (b, c) = [e,[f,g]]), [:e, :f, :g], [:a, :b, :c], [], [])
        @test testee(:((x, y), a, (b, c) = z, e, (f, g)), [:z, :e, :f, :g], [:x, :y, :a, :b, :c], [], [])
        @test testee(:((x[i], y.r), a, (b, c) = z, e, (f, g)), [:x, :i, :y, :z, :e, :f, :g], [:a, :b, :c], [], [])
        @test testee(:((a[i], b.r) = (c.d, 2)), [:a, :b, :i, :c], [], [], [])
    end
    @testset "Broadcasting" begin
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
    @testset "`try` & `catch`" begin
        @test testee(:(try a = b + 1 catch; end), [:b], [], [:+], [])
        @test testee(:(try a() catch e; e end), [], [], [:a], [])
        @test testee(:(try a() catch; e end), [:e], [], [:a], [])
        @test testee(:(try a + 1 catch a; a end), [:a], [], [:+], [])
        @test testee(:(try 1 catch e; e finally a end), [:a], [], [], [])
        @test testee(:(try 1 finally a end), [:a], [], [], [])
    end
    @testset "Comprehensions" begin
        @test testee(:([sqrt(s) for s in 1:n]), [:n], [], [:sqrt, :(:)], [])
        @test testee(:([sqrt(s + r) for s in 1:n, r in k]), [:n, :k], [], [:sqrt, :(:), :+], [])
        @test testee(:([s + j + r + m for s in 1:3 for j in 4:5 for (r, l) in [(1, 2)]]), [:m], [], [:+, :(:)], [])

        @test testee(:([a for a in a]), [:a], [], [], [])
        @test testee(:(for a in a; a; end), [:a], [], [], [])
        @test testee(:(let a = a; a; end), [:a], [], [], [])
        @test testee(:(let a = a end), [:a], [], [], [])
        @test testee(:(let a = b end), [:b], [], [], [])
        @test testee(:(a = a), [:a], [:a], [], [])
        @test testee(:(a = [a for a in a]), [:a], [:a], [], [])
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
    end
    @testset "Functions" begin
        @test testee(:(function g() r = 2; r end), [], [], [], [
            :g => ([], [], [], [])
        ])
        @test testee(:(function g end), [], [], [], [
            :g => ([], [], [], [])
        ])
        @test testee(:(function f() g(x) = x; end), [], [], [], [
            :f => ([], [], [], []) # g is not a global def
        ])
        @test testee(:(function f(x, y=1; r, s=3 + 3) r + s + x * y * z end), [], [], [], [
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
        @test testee(:(f(x, y=a + 1) = x * y * z), [], [], [], [
            :f => ([:z, :a], [], [:*, :+], [])
        ])
        @test testee(:(begin f() = 1; f end), [], [], [], [
            :f => ([], [], [], [])
        ])
        @test testee(:(begin f() = 1; f() end), [], [], [], [
            :f => ([], [], [], [])
        ])
        @test testee(:(begin
                f(x) = (global a = √b)
                f(x, y) = (global c = -d)
            end), [], [], [], [
            :f => ([:b, :d], [:a, :c], [:√, :-], [])
        ])
        @test testee(:(Base.show() = 0), [:Base], [], [], [
            [:Base, :show] => ([], [], [], [])
        ])
        @test testee(:(minimum(x) do (a, b); a + b end), [:x], [], [:minimum], [
            :anon => ([], [], [:+], [])
        ])
        @test testee(:(f = x -> x * y), [], [:f], [], [
            :anon => ([:y], [], [:*], [])
        ])
        @test testee(:(f = (x, y) -> x * y), [], [:f], [], [
            :anon => ([], [], [:*], [])
        ])
        @test testee(:(f = (x, y = a + 1) -> x * y), [], [:f], [], [
            :anon => ([:a], [], [:*, :+], [])
        ])
        @test testee(:((((a, b), c), (d, e)) -> a * b * c * d * e * f), [], [], [], [
            :anon => ([:f], [], [:*], [])
        ])

        @test testee(:(func(a)), [:a], [], [:func], [])
        @test testee(:(func(a; b=c)), [:a, :c], [], [:func], [])
        @test testee(:(func(a, b=c)), [:a, :c], [], [:func], [])
        @test testee(:(√ b), [:b], [], [:√], [])
        @test testee(:(funcs[i](b)), [:funcs, :i, :b], [], [], [])
        @test testee(:(f(a)(b)), [:a, :b], [], [:f], [])
        @test testee(:(f(a).b()), [:a], [], [:f], [])
        @test testee(:(a.b(c)), [:a, :c], [], [[:a,:b]], [])
        @test testee(:(a.b.c(d)), [:b, :d], [], [[:a,:b,:c]], []) # only referencing :b, and not :a, matches the behaviour of `import a.b`
        @test testee(:(a.b(c)(d)), [:a, :c, :d], [], [[:a,:b]], [])
        @test testee(:(a.b(c).d(e)), [:a, :c, :e], [], [[:a,:b]], [])
        @test testee(:(a.b[c].d(e)), [:a, :c, :e], [], [], [])
    end
    @testset "Functions & types" begin
        @test testee(:(function f(y::Int64=a)::String string(y) end), [], [], [], [
            :f => ([:String, :Int64, :a], [], [:string], [])
        ])
        @test testee(:(f(a::A)::C = a.a;), [], [], [], [
            :f => ([:A, :C], [], [], [])
        ])
        @test testee(:(function f(x::T; k=1) where T return x + 1 end), [], [], [], [
            :f => ([], [], [:+], [])
        ])
        @test testee(:(function f(x::T; k=1) where {T,S <: R} return x + 1 end), [], [], [], [
            :f => ([:R], [], [:+], [])
        ])
        @test testee(:(f(x)::String = x), [], [], [], [
            :f => ([:String], [], [], [])
        ])
        @test testee(:(MIME"text/html"), [], [], [Symbol("@MIME_str")], [])
        @test testee(:(function f(::MIME"text/html") 1 end), [], [], [], [
            :f => ([], [], [Symbol("@MIME_str")], [])
        ])
        @test testee(:(a(a::AbstractArray{T}) where T = 5), [], [], [], [
            :a => ([:AbstractArray], [], [], [])
        ])
        @test testee(:(a(a::AbstractArray{T,R}) where {T,S} = a + b), [], [], [], [
            :a => ([:AbstractArray, :b, :R], [], [:+], [])
        ])
        @test testee(:(f(::A) = 1), [], [], [], [
            :f => ([:A], [], [], [])
        ])
        @test testee(:(f(::A, ::B) = 1), [], [], [], [
            :f => ([:A, :B], [], [], [])
        ])
        @test testee(:(f(a::A, ::B, c::C...) = a + c), [], [], [], [
            :f => ([:A, :B, :C], [], [:+], [])
        ])
    end
    @testset "Scope modifiers" begin
        @test testee(:(let global a, b = 1, 2 end), [], [:a, :b], [], [])
        @test_broken testee(:(let global a = b = 1 end), [], [:a], [], []; verbose=false)
        @test testee(:(let global k = 3 end), [], [:k], [], [])
        @test_broken testee(:(let global k = r end), [], [:k], [], []; verbose=false)
        @test testee(:(let global k = 3; k end), [], [:k], [], [])
        @test testee(:(let global k += 3 end), [:k], [:k], [:+], [])
        @test testee(:(let global k; k = 4 end), [], [:k], [], [])
        @test testee(:(let global k; b = 5 end), [], [], [], [])
        @test testee(:(let a = 1, b = 2; show(a + b) end), [], [], [:show, :+], [])

        @test testee(:(begin local a, b = 1, 2 end), [], [], [], [])
        @test testee(:(begin local a = b = 1 end), [], [:b], [], [])
        @test testee(:(begin local k = 3 end), [], [], [], [])
        @test testee(:(begin local k = r end), [:r], [], [], [])
        @test testee(:(begin local k = 3; k; b = 4 end), [], [:b], [], [])
        @test testee(:(begin local k += 3 end), [], [], [:+], []) # does not reference global k
        @test testee(:(begin local k; k = 4 end), [], [], [], [])
        @test testee(:(begin local k; b = 5 end), [], [:b], [], [])
        @test testee(:(begin local r[1] = 5 end), [:r], [], [], [])
        @test_broken testee(:(begin begin local a = 2 end; a end), [:a], [], [], []; verbose=false)
        
        @test testee(:(function f(x) global k = x end), [], [], [], [
            :f => ([], [:k], [], [])
        ])
        @test testee(:((begin x = 1 end, y)), [:y], [:x], [], [])
        @test testee(:(x = let global a += 1 end), [:a], [:x, :a], [:+], [])
    end
    @testset "`import` & `using`" begin
        @test testee(:(using Plots), [], [:Plots], [], [])
        @test testee(:(using Plots.ExpressionExplorer), [], [:ExpressionExplorer], [], [])
        @test testee(:(using JSON, UUIDs), [], [:JSON, :UUIDs], [], [])
        @test testee(:(import Pluto), [], [:Pluto], [], [])
        @test testee(:(import Pluto: wow, wowie), [], [:wow, :wowie], [], [])
        @test testee(:(import Pluto.ExpressionExplorer.wow, Plutowie), [], [:wow, :Plutowie], [], [])
        @test testee(:(import .Pluto: wow), [], [:wow], [], [])
        @test testee(:(import ..Pluto: wow), [], [:wow], [], [])
    end
    @testset "Macros" begin
        @test testee(:(@time a = 2), [], [:a], [Symbol("@time")], [])
        @test testee(:(@f(x; y=z)), [:x, :z], [], [Symbol("@f")], [])
        @test testee(:(@f(x, y = z)), [:x, :z], [:y], [Symbol("@f")], []) # https://github.com/fonsp/Pluto.jl/issues/252
        @test testee(:(Base.@time a = 2), [:Base], [:a], [[:Base, Symbol("@time")]], [])
        @test testee(:(@enum a b c), [], [:a, :b, :c], [Symbol("@enum")], [])
        @test testee(:(@enum a b = d c), [:d], [:a, :b, :c], [Symbol("@enum")], [])
        @test testee(:(@gensym a b c), [], [:a, :b, :c], [Symbol("@gensym")], [])
        @test testee(:(Base.@gensym a b c), [:Base], [:a, :b, :c], [[:Base, Symbol("@gensym")]], [])
        @test testee(:(Base.@kwdef struct A; x = 1; y::Int = two; z end), [:Base], [:A], [[:Base, Symbol("@kwdef")], [:Base, Symbol("@__doc__")]], [
            :A => ([:Int, :two], [], [], [])
        ])
        @test testee(quote "asdf" f(x) = x end, [], [], [], [:f => ([], [], [], [])])

        @test testee(:(@bind a b), [:b], [:a], [:get, :applicable, :Bond, Symbol("@bind")], [])
        @test testee(:(let @bind a b end), [:b], [:a], [:get, :applicable, :Bond, Symbol("@bind")], [])

        @test testee(:(md"hey $(@bind a b) $(a)"), [:b], [:a], [:get, :applicable, :Bond, Symbol("@md_str"), Symbol("@bind")], [])
        @test testee(:(md"hey $(a) $(@bind a b)"), [:b, :a], [:a], [:get, :applicable, :Bond, Symbol("@md_str"), Symbol("@bind")], [])
        @test testee(:(html"a $(b = c)"), [], [], [Symbol("@html_str")], [])
        @test testee(:(md"a $(b = c) $(b)"), [:c], [:b], [Symbol("@md_str")], [])
        @test testee(:(md"\* $r"), [:r], [], [Symbol("@md_str")], [])
        @test testee(:(md"a \$(b = c)"), [], [], [Symbol("@md_str")], [])
        @test testee(:(macro a() end), [], [], [], [
            Symbol("@a") => ([], [], [], [])
        ])
        @test testee(:(macro a(b::Int); b end), [], [], [], [
            Symbol("@a") => ([:Int], [], [], [])
        ])
        @test testee(:(macro a(b::Int=c) end), [], [], [], [
            Symbol("@a") => ([:Int, :c], [], [], [])
        ])
        @test testee(:(macro a(); b = c; return b end), [], [], [], [
            Symbol("@a") => ([:c], [], [], [])
        ])
    end
    @testset "String interpolation & expressions" begin
        @test testee(:("a $b"), [:b], [], [], [])
        @test testee(:("a $(b = c)"), [:c], [:b], [], [])
        @test testee(:(ex = :(yayo)), [], [:ex], [], [])
        @test testee(:(ex = :(yayo + $r)), [], [:ex], [], [])
        # @test_broken testee(:(ex = :(yayo + $r)), [:r], [:ex], [], [], verbose=false)
    end
end
