import .ExpressionExplorer: SymbolsState, FunctionName

"Every cell is a node in the reactive graph. This struct contains the back edges (`references`) and forward edges (`definitions`, `funcdefs_with_signatures`, `funcdefs_without_signatures`). With 'edges' we mean the graph-theoretic concept: edges form the links in the directed reactivity graph. In a reactive notebook, these are the **global variable references and definitions**.

Before 0.12.0, we could have written this struct with just two fields: `references` and `definitions`, both of type `Set{Symbol}`, because we used variable names to form the reactive links. However, to support defining _multiple methods of the same function in different cells_ (https://github.com/fonsp/Pluto.jl/issues/177), we needed to change this. You might want to think about this old behavior first (try it on paper) before reading on.

The essential idea is that edges are still formed by `Symbol`s. Simple global variables (`x = 1`) are registered by their name, but _function definitions_ `f(x::Int) = 5` are sometimes stored in two ways:
- by their name (`f`), in `funcdefs_without_signatures`, and
- by their name, with its method signature hashed and concatenated (`f098140980983`), in `funcdefs_with_signatures`.

The name _without_ signature is most important: it is used to find the reactive dependencies between cells. The name _with_ signature is needed to detect multiple cells that define methods with the _same_ signature (`f(x) = 1` and `f(x) = 2`) - this is illegal. This is why we do not collect `definitions`, `funcdefs_with_signatures` and `funcdefs_without_signatures` onto a single pile: we need them separately for different searches.

`fundef_names` is just `fundefs_without_signatures`, but before `join_funcname_parts` is applied. This is kind of silly - it would be prettier to remove `join_funcname_parts` altogether and always work with the `FunctionName`.
"
Base.@kwdef struct ReactiveNode
    references::Set{Symbol} = Set{Symbol}()
    definitions::Set{Symbol} = Set{Symbol}()
	funcdefs_with_signatures::Set{Symbol} = Set{Symbol}()
    funcdefs_without_signatures::Set{Symbol} = Set{Symbol}()

    funcdef_names::Set{FunctionName} = Set{FunctionName}()
end

function Base.union!(a::ReactiveNode, bs::ReactiveNode...)
	union!(a.references, (b.references for b in bs)...)
	union!(a.definitions, (b.definitions for b in bs)...)
	union!(a.funcdefs_with_signatures, (b.funcdefs_with_signatures for b in bs)...)
	union!(a.funcdefs_without_signatures, (b.funcdefs_without_signatures for b in bs)...)
	union!(a.funcdef_names, (b.funcdef_names for b in bs)...)
	return a
end

"Turn a `SymbolsState` into a `ReactiveNode`. The main differences are:
- A `SymbolsState` is a nested structure of function definitions inside function definitions inside... This conversion flattens this structure by merging `SymbolsState`s from defined functions.
- `ReactiveNode` functions as a cache to improve efficienty, by turning the nested structures into multiple `Set{Symbol}`s with fast lookups."
function ReactiveNode(symstate::SymbolsState)
	result = ReactiveNode(
		references=Set{Symbol}(symstate.references), 
		definitions=Set{Symbol}(symstate.assignments),
		)
	
	# defined functions are 'exploded' into the cell's reactive node
	union!(result, (ReactiveNode(body_symstate) for (_, body_symstate) in symstate.funcdefs)...)

	# now we will add the function names to our edges:
	push!(result.references, (symstate.funccalls .|> join_funcname_parts)...)

	for (namesig, body_symstate) in symstate.funcdefs
		push!(result.funcdef_names, namesig.name)

		just_the_name = join_funcname_parts(namesig.name)
		push!(result.funcdefs_without_signatures, just_the_name)

		with_hashed_sig = Symbol(just_the_name, hash(namesig.canonicalized_head))
		push!(result.funcdefs_with_signatures, with_hashed_sig)
	end

	return result
end


