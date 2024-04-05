

const ObjectID = typeof(objectid("hello computer"))

function Base.show(io::IO, s::SymbolsState)
    print(io, "SymbolsState([")
    join(io, s.references, ", ")
    print(io, "], [")
    join(io, s.assignments, ", ")
    print(io, "], [")
    join(io, s.funccalls, ", ")
    print(io, "], [")
    if isempty(s.funcdefs)
        print(io, "]")
    else
        println(io)
        for (k, v) in s.funcdefs
            print(io, "    ", k, ": ", v)
            println(io)
        end
        print(io, "]")
    end
    if !isempty(s.macrocalls)
        print(io, "], [")
        print(io, s.macrocalls)
        print(io, "])")
    else
        print(io, ")")
    end
end

"Calls `ExpressionExplorer.compute_symbolreferences` on the given `expr` and test the found SymbolsState against a given one, with convient syntax.

# Example

```jldoctest
julia> @test testee(:(
    begin
        a = b + 1
        f(x) = x / z
    end),
    [:b, :+], # 1st: expected references
    [:a, :f], # 2nd: expected definitions
    [:+],     # 3rd: expected function calls
    [
        :f => ([:z, :/], [], [:/], [])
    ])        # 4th: expected function definitions, with inner symstate using the same syntax
true
```
"
function testee(expr::Any, expected_references, expected_definitions, expected_funccalls, expected_funcdefs, expected_macrocalls = []; verbose::Bool=true, transformer::Function=identify)
    expected = easy_symstate(expected_references, expected_definitions, expected_funccalls, expected_funcdefs, expected_macrocalls)
    
    expr_transformed = transformer(expr)

    original_hash = expr_hash(expr_transformed)
    result = ExpressionExplorer.compute_symbolreferences(expr_transformed)
    # should not throw:
    ReactiveNode(result)
    
    new_hash = expr_hash(expr_transformed)
    if original_hash != new_hash
        error("\n== The expression explorer modified the expression. Don't do that! ==\n")
    end

    # Anonymous function are given a random name, which looks like __ExprExpl_anon__67387237861123
    # To make testing easier, we rename all such functions to anon
    new_name(fn::FunctionName) = FunctionName(map(new_name, fn.parts)...)
    new_name(sym::Symbol) = startswith(string(sym), "__ExprExpl_anon__") ? :anon : sym

    result.assignments = Set(new_name.(result.assignments))
    result.funcdefs = let
        newfuncdefs = Dict{FunctionNameSignaturePair,SymbolsState}()
        for (k, v) in result.funcdefs
            union!(newfuncdefs, Dict(FunctionNameSignaturePair(new_name(k.name), hash("hello")) => v))
        end
        newfuncdefs
    end

    if verbose && expected != result
        println()
        println("FAILED TEST")
        println(expr)
        println()
        dump(expr, maxdepth=20)
        println()
        dump(expr_transformed, maxdepth=20)
        println()
        @show expected
        resulted = result
        @show resulted
        println()
    end
    return expected == result
end




expr_hash(e::Expr) = objectid(e.head) + mapreduce(p -> objectid((p[1], expr_hash(p[2]))), +, enumerate(e.args); init=zero(ObjectID))
expr_hash(x) = objectid(x)





function easy_symstate(expected_references, expected_definitions, expected_funccalls, expected_funcdefs, expected_macrocalls = [])
    array_to_set(array) = map(array) do k
        new_k = FunctionName(k)
        return new_k
    end |> Set
    new_expected_funccalls = array_to_set(expected_funccalls)
    
    new_expected_funcdefs = map(expected_funcdefs) do (k, v)
        new_k = FunctionName(k)
        new_v = v isa SymbolsState ? v : easy_symstate(v...)
        return FunctionNameSignaturePair(new_k, hash("hello")) => new_v
    end |> Dict

    new_expected_macrocalls = array_to_set(expected_macrocalls)

    SymbolsState(Set(expected_references), Set(expected_definitions), new_expected_funccalls, new_expected_funcdefs, new_expected_macrocalls)
end





t(args...; kwargs...) = testee(args...; transformer=Pluto.ExpressionExplorerExtras.pretransform_pluto, kwargs...)


"""
Like `t` but actually a convenient syntax
"""
function test_expression_explorer(; expr, references=[], definitions=[], funccalls=[], funcdefs=[], macrocalls=[], kwargs...)
    t(expr, references, definitions, funccalls, funcdefs, macrocalls; kwargs...)
end

@testset "Macros w/ Pluto 1" begin
    # Macros tests are not just in ExpressionExplorer now

    @test t(:(@time a = 2), [], [], [], [], [Symbol("@time")])
    @test t(:(@f(x; y=z)), [], [], [], [], [Symbol("@f")])
    @test t(:(@f(x, y = z)), [], [], [], [], [Symbol("@f")]) # https://github.com/fonsp/Pluto.jl/issues/252
    @test t(:(Base.@time a = 2), [], [], [], [], [[:Base, Symbol("@time")]])
    # @test_nowarn t(:(@enum a b = d c), [:d], [:a, :b, :c], [Symbol("@enum")], [])
    # @enum is tested in test/React.jl instead
    @test t(:(@gensym a b c), [], [:a, :b, :c], [:gensym], [], [Symbol("@gensym")])
    @test t(:(Base.@gensym a b c), [], [:a, :b, :c], [:gensym], [], [[:Base, Symbol("@gensym")]])
    @test t(:(Base.@kwdef struct A; x = 1; y::Int = two; z end), [], [], [], [], [[:Base, Symbol("@kwdef")]])
    # @test t(quote "asdf" f(x) = x end, [], [], [], [], [Symbol("@doc")])

    # @test t(:(@bind a b), [], [], [], [], [Symbol("@bind")])
    # @test t(:(PlutoRunner.@bind a b), [], [], [], [], [[:PlutoRunner, Symbol("@bind")]])
    # @test_broken t(:(Main.PlutoRunner.@bind a b), [:b], [:a], [[:Base, :get], [:Core, :applicable], [:PlutoRunner, :create_bond], [:PlutoRunner, Symbol("@bind")]], [], verbose=false)
    # @test t(:(let @bind a b end), [], [], [], [], [Symbol("@bind")])

    @test t(:(`hey $(a = 1) $(b)`), [:b], [], [:cmd_gen], [], [Symbol("@cmd")])
    # @test t(:(md"hey $(@bind a b) $(a)"), [:a], [], [[:getindex]], [], [Symbol("@md_str"), Symbol("@bind")])
    # @test t(:(md"hey $(a) $(@bind a b)"), [:a], [], [[:getindex]], [], [Symbol("@md_str"), Symbol("@bind")])

    @test t(:(@asdf a = x1 b = x2 c = x3), [], [], [], [], [Symbol("@asdf")]) # https://github.com/fonsp/Pluto.jl/issues/670
    
    @test t(:(@aa @bb xxx), [], [], [], [], [Symbol("@aa"), Symbol("@bb")])
    @test t(:(@aa @bb(xxx) @cc(yyy)), [], [], [], [], [Symbol("@aa"), Symbol("@bb"), Symbol("@cc")])
    
    @test t(:(Pkg.activate()), [:Pkg], [], [[:Pkg,:activate]], [], [])
    @test t(:(@aa(Pkg.activate())), [:Pkg], [], [[:Pkg,:activate]], [], [Symbol("@aa")])
    @test t(:(@aa @bb(Pkg.activate())), [:Pkg], [], [[:Pkg,:activate]], [], [Symbol("@aa"), Symbol("@bb")])
    @test t(:(@aa @assert @bb(Pkg.activate())), [:Pkg], [], [[:Pkg,:activate], [:throw], [:AssertionError]], [], [Symbol("@aa"), Symbol("@assert"), Symbol("@bb")])
    @test t(:(@aa @bb(Xxx.xxxxxxxx())), [], [], [], [], [Symbol("@aa"), Symbol("@bb")])
    
    @test t(:(include()), [], [], [[:include]], [], [])
    @test t(:(:(include())), [], [], [], [], [])
    @test t(:(:($(include()))), [], [], [[:include]], [], [])
    @test t(:(@xx include()), [], [], [[:include]], [], [Symbol("@xx")])
    @test t(quote
        module A
        include()
        Pkg.activate()
        @xoxo asdf
        end
    end, [], [:A], [], [], [])
    
    
    @test t(:(@aa @bb(using Zozo)), [], [:Zozo], [], [], [Symbol("@aa"), Symbol("@bb")])
    @test t(:(@aa(using Zozo)), [], [:Zozo], [], [], [Symbol("@aa")])
    @test t(:(using Zozo), [], [:Zozo], [], [], [])

    e = :(using Zozo)
    @test ExpressionExplorer.compute_usings_imports(
        e
    ).usings == [e]
    @test ExpressionExplorer.compute_usings_imports(
        :(@aa @bb($e))
    ).usings == [e]
    

    @test t(:(@einsum a[i,j] := x[i]*y[j]), [], [], [], [], [Symbol("@einsum")])
    @test t(:(@tullio a := f(x)[i+2j, k[j]] init=z), [], [], [], [], [Symbol("@tullio")])
    @test t(:(Pack.@asdf a[1,k[j]] := log(x[i]/y[j])), [], [], [], [], [[:Pack, Symbol("@asdf")]])


    @test t(:(html"a $(b = c)"), [], [], [], [], [Symbol("@html_str")])
    @test t(:(md"a $(b = c) $(b)"), [:c], [:b], [:getindex], [], [Symbol("@md_str")])
    @test t(:(md"\* $r"), [:r], [], [:getindex], [], [Symbol("@md_str")])
    @test t(:(md"a \$(b = c)"), [], [], [:getindex], [], [Symbol("@md_str")])
    @test t(:(macro a() end), [], [], [], [
        Symbol("@a") => ([], [], [], [])
    ])
    @test t(:(macro a(b::Int); b end), [], [], [], [
        Symbol("@a") => ([:Int], [], [], [])
    ])
    @test t(:(macro a(b::Int=c) end), [], [], [], [
        Symbol("@a") => ([:Int, :c], [], [], [])
    ])
    @test t(:(macro a(); b = c; return b end), [], [], [], [
        Symbol("@a") => ([:c], [], [], [])
    ])
    @test test_expression_explorer(;
        expr=:(@parent @child 10),
        macrocalls=[Symbol("@parent"), Symbol("@child")],
    )
    @test test_expression_explorer(;
        expr=:(@parent begin @child 1 + @grandchild 10 end),
        macrocalls=[Symbol("@parent"), Symbol("@child"), Symbol("@grandchild")],
    )
    @test t(macroexpand(Main, :(@noinline f(x) = x)), [], [], [], [
        Symbol("f") => ([], [], [], [])
    ])
end


@testset "Macros w/ Pluto 2" begin
    
    @test t(:(@bind a b), [:b, :PlutoRunner, :Base, :Core], [:a], [[:PlutoRunner, :create_bond], [:Core, :applicable], [:Base, :get]], [], [Symbol("@bind")])
    @test t(:(PlutoRunner.@bind a b), [:b, :PlutoRunner, :Base, :Core], [:a], [[:PlutoRunner, :create_bond], [:Core, :applicable], [:Base, :get]], [], [[:PlutoRunner, Symbol("@bind")]])
    @test_broken t(:(Main.PlutoRunner.@bind a b), [:b, :PlutoRunner, :Base, :Core], [:a], [[:Base, :get], [:Core, :applicable], [:PlutoRunner, :create_bond], [:PlutoRunner, Symbol("@bind")]], [], verbose=false)
    @test t(:(let @bind a b end), [:b, :PlutoRunner, :Base, :Core], [:a], [[:PlutoRunner, :create_bond], [:Core, :applicable], [:Base, :get]], [], [Symbol("@bind")])

    @test t(:(`hey $(a = 1) $(b)`), [:b], [], [:cmd_gen], [], [Symbol("@cmd")])
    @test t(:(md"hey $(@bind a b) $(a)"), [:b, :PlutoRunner, :Base, :Core], [:a], [[:PlutoRunner, :create_bond], [:Core, :applicable], [:Base, :get], :getindex], [], [Symbol("@md_str"), Symbol("@bind")])
    @test t(:(md"hey $(a) $(@bind a b)"), [:a, :b, :PlutoRunner, :Base, :Core], [:a], [[:PlutoRunner, :create_bond], [:Core, :applicable], [:Base, :get], :getindex], [], [Symbol("@md_str"), Symbol("@bind")])

    
end