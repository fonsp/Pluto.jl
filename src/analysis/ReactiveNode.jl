import .ExpressionExplorer: SymbolsState, FunctionName

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

"Account for globals referenced in function calls by including `SymbolsState`s from defined functions in the cell itself."
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


