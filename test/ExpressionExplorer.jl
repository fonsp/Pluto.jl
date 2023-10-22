using Test
import Pluto: PlutoRunner

#=
`@test_broken` means that the test doesn't pass right now, but we want it to pass. Feel free to try to fix it and open a PR!
Some of these @test_broken lines are commented out to prevent printing to the terminal, but we still want them fixed.

# When working on ExpressionExplorer:

- Go to runtests.jl and move `include("ExpressionExplorer.jl")` to the second line, so that they run instantly (after loading the helper functions). Be careful not to commit this change.
- If you are fixing a `@test_broken`:
  - uncomment that line if needed
  - change `@test_broken` to `@test`
  - remove `verbose=false` at the end of the line
- If you are fixing something else:
  - you can add lots of tests! They run super fast, don't worry about duplicates too much

-fons =#

@testset "Explore Expressions" begin
    let
        EE = Pluto.ExpressionExplorer
        scopestate = EE.ScopeState()

        @inferred EE.explore_assignment!(:(f(x) = x), scopestate)
        @inferred EE.explore_modifiers!(:(1 + 1), scopestate)
        @inferred EE.explore_dotprefixed_modifiers!(:([1] .+ [1]), scopestate)
        @inferred EE.explore_inner_scoped(:(let x = 1 end), scopestate)
        @inferred EE.explore_filter!(:(filter(true, a)), scopestate)
        @inferred EE.explore_generator!(:((x for x in a)), scopestate)
        @inferred EE.explore_macrocall!(:(@time 1), scopestate)
        @inferred EE.explore_call!(:(f(x)), scopestate)
        @inferred EE.explore_struct!(:(struct A end), scopestate)
        @inferred EE.explore_abstract!(:(abstract type A end), scopestate)
        @inferred EE.explore_function_macro!(:(function f(x); x; end), scopestate)
        @inferred EE.explore_try!(:(try nothing catch end), scopestate)
        @inferred EE.explore_anonymous_function!(:(x -> x), scopestate)
        @inferred EE.explore_global!(:(global x = 1), scopestate)
        @inferred EE.explore_local!(:(local x = 1), scopestate)
        @inferred EE.explore_tuple!(:((a, b)), scopestate)
        @inferred EE.explore_broadcast!(:(func.(a)), scopestate)
        @inferred EE.explore_load!(:(using Foo), scopestate)
        let
            @inferred EE.explore_interpolations!(:(quote 1 end), scopestate)
            @inferred EE.explore_quote!(:(quote 1 end), scopestate)
        end
        @inferred EE.explore_module!(:(module A end), scopestate)
        @inferred EE.explore_fallback!(:(1 + 1), scopestate)
        @inferred EE.explore!(:(1 + 1), scopestate)

        @inferred EE.split_funcname(:(Base.Submodule.f))
        @inferred EE.maybe_macroexpand(:(@time 1))
    end

    @testset "Basics" begin
        # Note that Meta.parse(x) is not always an Expr.
        @test testee(:(a), [:a], [], [], [])
        @test testee(Expr(:toplevel, :a), [:a], [], [], [])
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
        @test testee(:(123 = x), [:x], [], [], [])
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
        @test testee(:(abstract type a end), [], [:a], [], [
            :a => ([], [], [], [])
        ])
        @test testee(:(let struct a; b; c; end end), [], [:a], [], [
            :a => ([], [], [], [])
        ])
        @test testee(:(let abstract type a end end), [], [:a], [], [
            :a => ([], [], [], [])
        ])

        @test testee(:(module a; f(x) = x; z = r end), [], [:a], [], [])
    end
    @testset "Types" begin
        @test testee(:(x::Foo = 3), [:Foo], [:x], [], [])
        @test testee(:(x::Foo), [:x, :Foo], [], [], [])
        @test testee(quote
            a::Foo, b::String = 1, "2"
        end, [:Foo, :String], [:a, :b], [], [])
        @test testee(:(Foo[]), [:Foo], [], [], [])
        @test testee(:(x isa Foo), [:x, :Foo], [], [:isa], [])

        @test testee(quote
            (x[])::Int = 1
        end, [:Int, :x], [], [], [])
        @test testee(quote
            (x[])::Int, y = 1, 2
        end, [:Int, :x], [:y], [], [])

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
        @test testee(:(struct a{A,B<:C{A}}; i::A; j::B end), [], [:a], [], [:a => ([:C], [], [], [])])
        @test testee(:(struct a{A,B<:C{<:A}} <: D{A,B}; i::A; j::B end), [], [:a], [], [:a => ([:C, :D], [], [], [])])
        @test testee(:(struct a{A,DD<:B.C{D.E{A}}} <: K.A{A} i::A; j::DD; k::C end), [], [:a], [], [:a => ([:B, :C, :D, :K], [], [], [])])
        @test testee(:(struct a; x; a(t::T) where {T} = new(t); end), [], [:a], [], [:a => ([], [], [[:new]], [])])
        @test testee(:(struct a; x; y; a(t::T) where {T} = new(t, T); end), [], [:a], [], [:a => ([], [], [[:new]], [])])
        @test testee(:(struct a; f() = a() end), [], [:a], [], [:a => ([], [], [], [])])

        @test testee(:(abstract type a <: b end), [], [:a], [], [:a => ([:b], [], [], [])])
        @test testee(:(abstract type a{T,S} end), [], [:a], [], [:a => ([], [], [], [])])
        @test testee(:(abstract type a{T} <: b end), [], [:a], [], [:a => ([:b], [], [], [])])
        @test testee(:(abstract type a{T} <: b{T} end), [], [:a], [], [:a => ([:b], [], [], [])])
        @test testee(:(abstract type a end), [], [:a], [], [:a => ([], [], [], [])])
        @test testee(:(abstract type a{A,B<:C{A}} end), [], [:a], [], [:a => ([:C], [], [], [])])
        @test testee(:(abstract type a{A,B<:C{<:A}} <: D{A,B} end), [], [:a], [], [:a => ([:C, :D], [], [], [])])
        @test testee(:(abstract type a{A,DD<:B.C{D.E{A}}} <: K.A{A} end), [], [:a], [], [:a => ([:B, :D, :K], [], [], [])])
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
        @test testee(:(_ = a + 1), [:a], [], [:+], [])
        @test testee(:(a = _ + 1), [], [:a], [:+], [])

        @test testee(:(f()[] = 1), [], [], [:f], [])
        @test testee(:(x[f()] = 1), [:x], [], [:f], [])
    end
    @testset "Multiple assignments" begin
        # Note that using the shorthand syntax :(a = 1, b = 2) to create an expression
        # will automatically return a :tuple Expr and not a multiple assignment
        # we use quotes instead of this syntax to be sure of what is tested since quotes
        # would behave the same way as Meta.parse() which Pluto uses to evaluate cell code.
        ex = quote
            a, b = 1, 2
        end
        @test Meta.isexpr(ex.args[2], :(=))

        @test testee(quote
            a, b = 1, 2
        end, [], [:a, :b], [], [])
        @test testee(quote
            a, _, c, __ = 1, 2, 3, _d
        end, [:_d], [:a, :c], [], [])
        @test testee(quote
            (a, b) = 1, 2
        end, [], [:a, :b], [], [])
        @test testee(quote
            a = (b, c)
        end, [:b, :c], [:a], [], [])
        @test testee(quote
            a, (b, c) = [e,[f,g]]
        end, [:e, :f, :g], [:a, :b, :c], [], [])
        @test testee(quote
            a, (b, c) = [e,[f,g]]
        end, [:e, :f, :g], [:a, :b, :c], [], [])
        @test testee(quote
            (x, y), a, (b, c) = z, e, (f, g)
        end, [:z, :e, :f, :g], [:x, :y, :a, :b, :c], [], [])
        @test testee(quote
            (x[i], y.r), a, (b, c) = z, e, (f, g)
        end, [:x, :i, :y, :z, :e, :f, :g], [:a, :b, :c], [], [])
        @test testee(quote
            (a[i], b.r) = (c.d, 2)
        end, [:a, :b, :i, :c], [], [], [])
        @test testee(quote
            a, b... = 0:5
        end, [],[:a, :b], [[:(:)]], [])
        @test testee(quote
            a[x], x = 1, 2
        end, [:a], [:x], [], [])
        @test testee(quote
            x, a[x] = 1, 2
        end, [:a], [:x], [], [])
        @test testee(quote
            f, a[f()] = g
        end, [:g, :a], [:f], [], [])
        @test testee(quote
            a[f()], f = g
        end, [:g, :a], [:f], [], [])
        @test testee(quote (; a, b) = x end, [:x], [:a, :b], [], [])
        @test testee(quote a = (b, c) end, [:b, :c], [:a], [], [])

        @test testee(:(const a, b = 1, 2), [], [:a, :b], [], [])
    end
    @testset "Tuples" begin
        ex = :(1, 2, a, b, c)
        @test Meta.isexpr(ex, :tuple)

        @test testee(:((a, b,)), [:a,:b], [], [], [])
        @test testee(:((a, b, c, 1, 2, 3, :d, f()..., let y = 3 end)), [:a, :b, :c], [], [:f], [])

        @test testee(:((a = b, c = 2, d = 123,)), [:b], [], [], [])
        @test testee(:((a = b, c, d, f()..., let x = (;a = e) end...)), [:b, :c, :d, :e], [], [:f], [])
        @test testee(:((a = b,)), [:b], [], [], [])
        @test testee(:(a = b, c), [:b, :c], [], [], [])
        @test testee(:(a, b = c), [:a, :c], [], [], [])

        # Invalid named tuples but still parses just fine
        @test testee(:((a, b = 1, 2)), [:a], [], [], [])
        @test testee(:((a, b) = 1, 2), [], [], [], [])
    end
    @testset "Broadcasting" begin
        @test testee(:(a .= b), [:b, :a], [], [], []) # modifies elements, doesn't set `a`
        @test testee(:(a .+= b), [:b, :a], [], [:+], [])
        @test testee(:(a[i] .+= b), [:b, :a, :i], [], [:+], [])
        @test testee(:(a .+ b ./ sqrt.(c, d)), [:a, :b, :c, :d], [], [:+, :/, :sqrt], [])

        # in 1.5 :(.+) is a symbol, in 1.6 its Expr:(:(.), :+)
        broadcasted_add = :(.+) isa Symbol ? :(.+) : :+
        @test testee(:(f = .+), [broadcasted_add], [:f], [], [])
        @test testee(:(reduce(.+, foo)), [broadcasted_add, :foo], [], [:reduce], [])
    end
    @testset "`for` & `while`" begin
        @test testee(:(for k in 1:n; k + s; end), [:n, :s], [], [:+, :(:)], [])
        @test testee(:(for k in 1:2, r in 3:4; global z = k + r; end), [], [:z], [:+, :(:)], [])
        @test testee(:(while k < 2; r = w; global z = k + r; end), [:k, :w], [:z], [:+, :(<)], [])
    end
    @testset "`try` & `catch` & `else` & `finally`" begin
        @test testee(:(try a = b + 1 catch; end), [:b], [], [:+], [])
        @test testee(:(try a() catch e; e end), [], [], [:a], [])
        @test testee(:(try a() catch; e end), [:e], [], [:a], [])
        @test testee(:(try a + 1 catch a; a end), [:a], [], [:+], [])
        @test testee(:(try 1 catch e; e finally a end), [:a], [], [], [])
        @test testee(:(try 1 finally a end), [:a], [], [], [])

        # try catch else was introduced in 1.8
        @static if VERSION >= v"1.8.0"
            @test testee(:(try 1 catch else x = 1; x finally a; end), [:a], [], [], [])
            @test testee(:(try 1 catch else x = j; x finally a; end), [:a, :j], [], [], [])
            @test testee(:(try x = 2 catch else x finally a; end), [:a, :x], [], [], [])
            @test testee(:(try x = 2 catch else x end), [:x], [], [], [])
        end
    end
    @testset "Comprehensions" begin
        @test testee(:([sqrt(s) for s in 1:n]), [:n], [], [:sqrt, :(:)], [])
        @test testee(:([sqrt(s + r) for s in 1:n, r in k]), [:n, :k], [], [:sqrt, :(:), :+], [])
        @test testee(:([s + j + r + m for s in 1:3 for j in 4:5 for (r, l) in [(1, 2)]]), [:m], [], [:+, :(:)], [])
        @test testee(:([a for a in b if a != 2]), [:b], [], [:(!=)], [])
        @test testee(:([a for a in f() if g(a)]), [], [], [:f, :g], [])
        @test testee(:([c(a) for a in f() if g(a)]), [], [], [:c, :f, :g], [])
        @test testee(:([k for k in P, j in 1:k]), [:k, :P], [], [:(:)], [])

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
        @test testee(:(function f(z) g(x) = x; g(z) end), [], [], [], [
            :f => ([], [], [], [])
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
        @test testee(:(function f(x, args...; kwargs...) return [x, y, args..., kwargs...] end), [], [], [], [
            :f => ([:y], [], [], [])
        ])
        @test testee(:(function f(x; y=x) y + x end), [], [], [], [
            :f => ([], [], [:+], [])
        ])
        @test testee(:(function (A::MyType)(x; y=x) y + x end), [], [], [], [
            :MyType => ([], [], [:+], [])
        ])
        @test testee(:(f(x, y=a + 1) = x * y * z), [], [], [], [
            :f => ([:z, :a], [], [:*, :+], [])
        ])
        @test testee(:(f(x, y...) = y),[],[],[],[
            :f => ([], [], [], [])
        ])
        @test testee(:(f((x, y...), z) = y),[],[],[],[
            :f => ([], [], [], [])
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
        @test testee(:((x;p) -> f(x+p)), [], [], [], [
            :anon => ([], [], [:f, :+], [])
        ])
        @test testee(:(() -> Date), [], [], [], [
            :anon => ([:Date], [], [], [])
        ])
        @test testee(:(begin x; p end -> f(x+p)), [], [], [], [
            :anon => ([], [], [:f, :+], [])
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
        @test testee(:((a...) -> f(a...)), [], [], [], [
            :anon => ([], [], [:f], [])
        ])
        @test testee(:(f = (args...) -> [args..., y]), [], [:f], [], [
            :anon => ([:y], [], [], [])
        ])
        @test testee(:(f = (x, args...; kwargs...) -> [x, y, args..., kwargs...]), [], [:f], [], [
            :anon => ([:y], [], [], [])
        ])
        @test testee(:(f = function (a, b) a + b * n end), [:n], [:f], [:+, :*], [])
        @test testee(:(f = function () a + b end), [:a, :b], [:f], [:+], [])

        @test testee(:(g(; b=b) = b), [], [], [], [:g => ([:b], [], [], [])])
        @test testee(:(g(b=b) = b), [], [], [], [:g => ([:b], [], [], [])])
        @test testee(:(f(x = y) = x), [], [], [], [:f => ([:y], [], [], [])])
        @test testee(:(f(x, g=function(y=x) x + y + z end) = x * g(x)), [], [], [], [
            :f => ([:z], [], [:+, :*], [])
        ])

        @test testee(:(func(a)), [:a], [], [:func], [])
        @test testee(:(func(a; b=c)), [:a, :c], [], [:func], [])
        @test testee(:(func(a, b=c)), [:a, :c], [], [:func], [])
        @test testee(:(√ b), [:b], [], [:√], [])
        @test testee(:(funcs[i](b)), [:funcs, :i, :b], [], [], [])
        @test testee(:(f(a)(b)), [:a, :b], [], [:f], [])
        @test testee(:(f(a).b()), [:a], [], [:f], [])
        @test testee(:(f(a...)),[:a],[],[:f],[])
        @test testee(:(f(a, b...)),[:a, :b],[],[:f],[])

        @test testee(:(a.b(c)), [:a, :c], [], [[:a,:b]], [])
        @test testee(:(a.b.c(d)), [:a, :d], [], [[:a,:b,:c]], [])
        @test testee(:(a.b(c)(d)), [:a, :c, :d], [], [[:a,:b]], [])
        @test testee(:(a.b(c).d(e)), [:a, :c, :e], [], [[:a,:b]], [])
        @test testee(:(a.b[c].d(e)), [:a, :c, :e], [], [], [])
        @test testee(:(let aa = blah; aa.f() end), [:blah], [], [], [])
        @test testee(:(let aa = blah; aa.f(a, b, c) end), [:blah, :a, :b, :c], [], [], [])
        @test testee(:(f(a) = a.b()), [], [], [], [:f => ([], [], [], [])])

        @test testee(:(function f()
            function hello()
            end
            hello()
        end), [], [], [], [:f => ([], [], [], [])])
        @test testee(:(function a()
            b() = Test()
            b()
        end), [], [], [], [:a => ([], [], [:Test], [])])
        @test testee(:(begin
            function f()
                g() = z
                g()
            end
            g()
        end), [], [], [:g], [:f => ([:z], [], [], [])])
    end
    @testset "Julia lowering" begin
        @test test_expression_explorer(expr=:(a'b), references=[:a, :b], funccalls=[:*, :adjoint])
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
        @test testee(:(MIME"text/html"), [], [], [], [], [Symbol("@MIME_str")])
        @test testee(:(function f(::MIME"text/html") 1 end), [], [], [], [
            :f => ([], [], [], [], [Symbol("@MIME_str")])
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

        @test testee(:((obj::MyType)(x,y) = x + z), [], [], [], [
            :MyType => ([:z], [], [:+], [])
        ])
        @test testee(:((obj::MyType)() = 1), [], [], [], [
            :MyType => ([], [], [], [])
        ])
        @test testee(:((obj::MyType)(x, args...; kwargs...) = [x, y, args..., kwargs...]), [], [], [], [
            :MyType => ([:y], [], [], [])
        ])
        @test testee(:(function (obj::MyType)(x, y) x + z end), [], [], [], [
            :MyType => ([:z], [], [:+], [])
        ])
        @test testee(:(begin struct MyType x::String end; (obj::MyType)(y) = obj.x + y; end), [], [:MyType], [], [
            :MyType => ([:String], [], [:+], [])
        ])
        @test testee(:(begin struct MyType x::String end; function(obj::MyType)(y) obj.x + y; end; end), [], [:MyType], [], [
            :MyType => ([:String], [], [:+], [])
        ])
        @test testee(:((::MyType)(x,y) = x + y), [], [], [], [
            :MyType => ([], [], [:+], [])
        ])
        @test testee(:((obj::typeof(Int64[]))(x, y::Float64) = obj + x + y), [], [], [], [
            :anon => ([:Int64, :Float64], [], [:+, :typeof], [])
        ])
        @test testee(:((::Get(MyType))(x, y::OtherType) = y * x + z), [], [], [], [
            :anon => ([:MyType, :z, :OtherType], [], [:Get, :*, :+], [])
        ])
    end
    @testset "Scope modifiers" begin
        @test testee(:(let; global a, b = 1, 2 end), [], [:a, :b], [], [])
        @test_broken testee(:(let; global a = b = 1 end), [], [:a], [], []; verbose=false)
        @test testee(:(let; global k = 3 end), [], [:k], [], [])
        @test_broken testee(:(let; global k = r end), [], [:k], [], []; verbose=false)
        @test testee(:(let; global k = 3; k end), [], [:k], [], [])
        @test testee(:(let; global k += 3 end), [:k], [:k], [:+], [])
        @test testee(:(let; global k; k = 4 end), [], [:k], [], [])
        @test testee(:(let; global k; b = 5 end), [], [], [], [])
        @test testee(:(let; global x, y, z; b = 5; x = 1; (y,z) = 3 end), [], [:x, :y, :z], [], [])
        @test testee(:(let; global x, z; b = 5; x = 1; end), [], [:x], [], [])
        @test testee(:(let a = 1, b = 2; show(a + b) end), [], [], [:show, :+], [])
        @test_broken testee(:(let a = 1; global a = 2; end), [], [:a], [], []; verbose=false)

        @test testee(:(begin local a, b = 1, 2 end), [], [], [], [])
        @test testee(:(begin local a = b = 1 end), [], [:b], [], [])
        @test testee(:(begin local k = 3 end), [], [], [], [])
        @test testee(:(begin local k = r end), [:r], [], [], [])
        @test testee(:(begin local k = 3; k; b = 4 end), [], [:b], [], [])
        @test testee(:(begin local k += 3 end), [], [], [:+], []) # does not reference global k
        @test testee(:(begin local k; k = 4 end), [], [], [], [])
        @test testee(:(begin local k; b = 5 end), [], [:b], [], [])
        @test testee(:(begin local r[1] = 5 end), [:r], [], [], [])
        @test testee(:(begin local a, b; a = 1; b = 2 end), [], [], [], [])
        @test testee(:(begin a; local a, b; a = 1; b = 2 end), [:a], [], [], [])
        @test_broken testee(:(begin begin local a = 2 end; a end), [:a], [], [], []; verbose=false)
        
        @test testee(:(function f(x) global k = x end), [], [], [], [
            :f => ([], [:k], [], [])
        ])
        @test testee(:((begin x = 1 end, y)), [:y], [:x], [], [])
        @test testee(:(x = let; global a += 1 end), [:a], [:x, :a], [:+], [])
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
        @test testee(:(let; import Pluto.wow, Dates; end), [], [:wow, :Dates], [], [])
        @test testee(:(while false; import Pluto.wow, Dates; end), [], [:wow, :Dates], [], [])
        @test testee(:(try; using Pluto.wow, Dates; catch; end), [], [:wow, :Dates], [], [])
        @test testee(:(module A; import B end), [], [:A], [], [])
    end
    @testset "Foreign macros" begin
        # parameterizedfunctions
        @test testee(quote
        f = @ode_def LotkaVolterra begin
            dx = a*x - b*x*y
            dy = -c*y + d*x*y
          end a b c d
        end, [], [:f], [], [], [Symbol("@ode_def")])
        @test testee(quote
        f = @ode_def begin
            dx = a*x - b*x*y
            dy = -c*y + d*x*y
          end a b c d
        end, [], [:f], [], [], [Symbol("@ode_def")])
        # flux
        @test testee(:(@functor Asdf), [], [], [], [], [Symbol("@functor")])
        # symbolics
        @test testee(:(@variables a b c), [], [], [], [], [Symbol("@variables")])
        @test testee(:(@variables a b[1:2] c(t) d(..)), [], [], [], [], [Symbol("@variables")])
        @test testee(:(@variables a b[1:x] c[1:10](t) d(..)), [], [], [], [], [Symbol("@variables")])
        @test_nowarn testee(:(@variables(m, begin
            x
            y[i=1:2] >= i, (start = i, base_name = "Y_$i")
            z, Bin
        end)), [:m, :Bin], [:x, :y, :z], [Symbol("@variables")], [], verbose=false)
        # jump
    #     @test testee(:(@variable(m, x)), [:m], [:x], [Symbol("@variable")], [])
    #     @test testee(:(@variable(m, 1<=x)), [:m], [:x], [Symbol("@variable")], [])
    #     @test testee(:(@variable(m, 1<=x<=2)), [:m], [:x], [Symbol("@variable")], [])
    #     @test testee(:(@variable(m, r <= x[i=keys(asdf)] <= ub[i])), [:m, :r, :asdf, :ub], [:x], [:keys, Symbol("@variable")], [])
    #     @test testee(:(@variable(m, x, lower_bound=0)), [:m], [:x], [Symbol("@variable")], [])
    #     @test testee(:(@variable(m, base_name="x", lower_bound=0)), [:m], [], [Symbol("@variable")], [])
    #     @test testee(:(@variables(m, begin
    #     x
    #     y[i=1:2] >= i, (start = i, base_name = "Y_$i")
    #     z, Bin
    # end)), [:m, :Bin], [:x, :y, :z], [Symbol("@variables")], [])
    end
    @testset "Macros" begin
        # Macros tests are not just in ExpressionExplorer now

        @test testee(:(@time a = 2), [], [], [], [], [Symbol("@time")])
        @test testee(:(@f(x; y=z)), [], [], [], [], [Symbol("@f")])
        @test testee(:(@f(x, y = z)), [], [], [], [], [Symbol("@f")]) # https://github.com/fonsp/Pluto.jl/issues/252
        @test testee(:(Base.@time a = 2), [], [], [], [], [[:Base, Symbol("@time")]])
        # @test_nowarn testee(:(@enum a b = d c), [:d], [:a, :b, :c], [Symbol("@enum")], [])
        # @enum is tested in test/React.jl instead
        @test testee(:(@gensym a b c), [], [:a, :b, :c], [:gensym], [], [Symbol("@gensym")])
        @test testee(:(Base.@gensym a b c), [], [:a, :b, :c], [:gensym], [], [[:Base, Symbol("@gensym")]])
        @test testee(:(Base.@kwdef struct A; x = 1; y::Int = two; z end), [], [], [], [], [[:Base, Symbol("@kwdef")]])
        @test testee(quote "asdf" f(x) = x end, [], [], [], [], [Symbol("@doc")])

        @test testee(:(@bind a b), [:b, :PlutoRunner, :Base, :Core], [:a], [[:PlutoRunner, :create_bond], [:Core, :applicable], [:Base, :get]], [], [Symbol("@bind")])
        @test testee(:(PlutoRunner.@bind a b), [:b, :PlutoRunner, :Base, :Core], [:a], [[:PlutoRunner, :create_bond], [:Core, :applicable], [:Base, :get]], [], [[:PlutoRunner, Symbol("@bind")]])
        @test_broken testee(:(Main.PlutoRunner.@bind a b), [:b, :PlutoRunner, :Base, :Core], [:a], [[:Base, :get], [:Core, :applicable], [:PlutoRunner, :create_bond], [:PlutoRunner, Symbol("@bind")]], [], verbose=false)
        @test testee(:(let @bind a b end), [:b, :PlutoRunner, :Base, :Core], [:a], [[:PlutoRunner, :create_bond], [:Core, :applicable], [:Base, :get]], [], [Symbol("@bind")])

        @test testee(:(@asdf a = x1 b = x2 c = x3), [], [], [], [], [Symbol("@asdf")]) # https://github.com/fonsp/Pluto.jl/issues/670

        @test testee(:(@einsum a[i,j] := x[i]*y[j]), [], [], [], [], [Symbol("@einsum")])
        @test testee(:(@tullio a := f(x)[i+2j, k[j]] init=z), [], [], [], [], [Symbol("@tullio")])
        @test testee(:(Pack.@asdf a[1,k[j]] := log(x[i]/y[j])), [], [], [], [], [[:Pack, Symbol("@asdf")]])

        @test testee(:(`hey $(a = 1) $(b)`), [:b], [], [:cmd_gen], [], [Symbol("@cmd")])
        @test testee(:(md"hey $(@bind a b) $(a)"), [:b, :PlutoRunner, :Base, :Core], [:a], [[:PlutoRunner, :create_bond], [:Core, :applicable], [:Base, :get], :getindex], [], [Symbol("@md_str"), Symbol("@bind")])
        @test testee(:(md"hey $(a) $(@bind a b)"), [:a, :b, :PlutoRunner, :Base, :Core], [:a], [[:PlutoRunner, :create_bond], [:Core, :applicable], [:Base, :get], :getindex], [], [Symbol("@md_str"), Symbol("@bind")])
        @test testee(:(html"a $(b = c)"), [], [], [], [], [Symbol("@html_str")])
        @test testee(:(md"a $(b = c) $(b)"), [:c], [:b], [:getindex], [], [Symbol("@md_str")])
        @test testee(:(md"\* $r"), [:r], [], [:getindex], [], [Symbol("@md_str")])
        @test testee(:(md"a \$(b = c)"), [], [], [:getindex], [], [Symbol("@md_str")])
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
        @test test_expression_explorer(
            expr=:(@parent @child 10),
            macrocalls=[Symbol("@parent"), Symbol("@child")],
        )
        @test test_expression_explorer(
            expr=:(@parent begin @child 1 + @grandchild 10 end),
            macrocalls=[Symbol("@parent"), Symbol("@child"), Symbol("@grandchild")],
        )
        @test testee(macroexpand(Main, :(@noinline f(x) = x)), [], [], [], [
            Symbol("f") => ([], [], [], [])
        ])
    end
    @testset "Macros and heuristics" begin
        @test test_expression_explorer(
            expr=:(@macro import Pkg),
            macrocalls=[Symbol("@macro")],
            definitions=[:Pkg],
        )
        @test test_expression_explorer(
            expr=:(@macro Pkg.activate("..")),
            macrocalls=[Symbol("@macro")],
            references=[:Pkg],
            funccalls=[[:Pkg, :activate]],
        )
        @test test_expression_explorer(
            expr=:(@macro Pkg.add("Pluto.jl")),
            macrocalls=[Symbol("@macro")],
            references=[:Pkg],
            funccalls=[[:Pkg, :add]],
        )
        @test test_expression_explorer(
            expr=:(@macro include("Firebasey.jl")),
            macrocalls=[Symbol("@macro")],
            funccalls=[[:include]],
        )
    end
    @testset "Module imports" begin
        @test test_expression_explorer(
            expr=quote
                module X
                    import ..imported_from_outside
                end
            end,
            references=[:imported_from_outside],
            definitions=[:X],
        )
        @test test_expression_explorer(
            expr=quote
                module X
                    import ..imported_from_outside
                    import Y
                    import ...where_would_this_even_come_from
                    import .not_defined_but_sure
                end
            end,
            references=[:imported_from_outside],
            definitions=[:X],
        )
        # More advanced, might not be possible easily
        @test test_expression_explorer(
            expr=quote
                module X
                    module Y
                        import ...imported_from_outside
                    end
                end
            end,
            references=[:imported_from_outside],
            definitions=[:X]
        )
    end
    @testset "String interpolation & expressions" begin
        @test testee(:("a $b"), [:b], [], [], [])
        @test testee(:("a $(b = c)"), [:c], [:b], [], [])
        # @test_broken testee(:(`a $b`), [:b], [], [], [])
        # @test_broken testee(:(`a $(b = c)`), [:c], [:b], [], [])
        @test testee(:(ex = :(yayo)), [], [:ex], [], [])
        @test testee(:(ex = :(yayo + $r)), [:r], [:ex], [], [])
        @test test_expression_explorer(
            expr=:(quote $(x) end),
            references=[:x],
        )
        @test test_expression_explorer(
            expr=:(quote z = a + $(x) + b() end),
            references=[:x],
        )
        @test test_expression_explorer(
            expr=:(:($(x))),
            references=[:x],
        )
        @test test_expression_explorer(
            expr=:(:(z = a + $(x) + b())),
            references=[:x],
        )
    end
    @testset "Special reactivity rules" begin
        @test testee(
            :(BenchmarkTools.generate_benchmark_definition(Main, Symbol[], Any[], Symbol[], (), $(Expr(:copyast, QuoteNode(:(f(x, y, z))))), $(Expr(:copyast, QuoteNode(:()))), $(Expr(:copyast, QuoteNode(nothing))), BenchmarkTools.parameters())),
            [:Main, :BenchmarkTools, :Any, :Symbol, :x, :y, :z], [], [[:BenchmarkTools, :generate_benchmark_definition], [:BenchmarkTools, :parameters], :f], []
        )
        @test testee(
            :(BenchmarkTools.generate_benchmark_definition(Main, Symbol[], Any[], Symbol[], (), $(Expr(:copyast, QuoteNode(:(f(x, y, z))))), $(Expr(:copyast, QuoteNode(:(x = A + B)))), $(Expr(:copyast, QuoteNode(nothing))), BenchmarkTools.parameters())),
            [:Main, :BenchmarkTools, :Any, :Symbol, :y, :z, :A, :B], [], [[:BenchmarkTools, :generate_benchmark_definition], [:BenchmarkTools, :parameters], :f, :+], []
        )
        @test testee(
            :(Base.macroexpand(Main, $(QuoteNode(:(@enum a b c))))),
            [:Main, :Base], [], [[:Base, :macroexpand]], [], [Symbol("@enum")]
        )
    end
    @testset "Invalid code sometimes generated by macros" begin
        @test testee(
            :(f(; $(:(x = true)))),
            [], [], [:f], []
        )
        @test testee(
            :(f(a, b, c; y, z = a, $(:(x = true)))),
            [:a, :b, :c, :y], [], [:f], []
        )
        @test testee(
            :(f(a, b, c; y, z = a, $(:(x = true))) = nothing),
            [], [], [], [
                :f => ([:nothing], [], [], [])
            ]
        )
    end
    @testset "Extracting `using` and `import`" begin
        expr = quote
            using A
            import B
            if x
                using .C: r
                import ..D.E: f, g
            else
                import H.I, J, K.L
            end
            
            quote
                using Nonono
            end
        end
        result = ExpressionExplorer.compute_usings_imports(expr)
        @test result.usings == Set{Expr}([
            :(using A),
            :(using .C: r),
        ])
        @test result.imports == Set{Expr}([
            :(import B),
            :(import ..D.E: f, g),
            :(import H.I, J, K.L),
        ])

        @test ExpressionExplorer.external_package_names(result) == Set{Symbol}([
            :A, :B, :H, :J, :K
        ])

        @test ExpressionExplorer.external_package_names(:(using Plots, Something.Else, .LocalModule)) == Set([:Plots, :Something])
        @test ExpressionExplorer.external_package_names(:(import Plots.A: b, c)) == Set([:Plots])

        @test ExpressionExplorer.external_package_names(Meta.parse("import Foo as Bar, Baz.Naz as Jazz")) == Set([:Foo, :Baz])
    end

    @testset "ReactiveNode" begin
        rn = Pluto.ReactiveNode_from_expr(quote
            () -> Date
        end)
        @test :Date ∈ rn.references
    end
end

@testset "UTF-8 to Codemirror UTF-16 byte mapping" begin
    # range ends are non inclusives
    tests = [
        (" aaaa", (2, 4), (1, 3)), # cm is zero based
        (" 🍕🍕", (2, 6), (1, 3)), # a 🍕 is two UTF16 codeunits
        (" 🍕🍕", (6, 10), (3, 5)), # a 🍕 is two UTF16 codeunits
    ]
    for (s, (start_byte, end_byte), (from, to)) in tests
        @test PlutoRunner.map_byte_range_to_utf16_codepoints(s, start_byte, end_byte) == (from, to)
    end
end
