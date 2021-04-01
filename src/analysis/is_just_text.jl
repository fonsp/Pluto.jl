const md_and_friends = [Symbol("@md_str"), Symbol("@html_str"), :getindex]

"""Does the cell only contain md"..." and html"..."?

This is used to run these cells first."""
function is_just_text(topology::NotebookTopology, cell::Cell)::Bool
	# https://github.com/fonsp/Pluto.jl/issues/209
	isempty(topology.nodes[cell].definitions) && isempty(topology.nodes[cell].funcdefs_with_signatures) && 
		topology.nodes[cell].references ⊆ md_and_friends &&
		no_loops(ExpressionExplorer.maybe_macroexpand(topology.codes[cell].parsedcode; recursive=true))
end

function no_loops(ex::Expr)
	if ex.head  === :while ||
		ex.head === :for ||
		ex.head === :comprehension ||
		ex.head === :generator ||
		ex.head === :try ||
		ex.head === :quote ||
		ex.head === :module
		false
	else
		all(no_loops, ex.args)
	end
end

no_loops(x) = true