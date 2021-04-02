import .ExpressionExplorer: SymbolsState, FunctionName

"Information container about the cells to run in a reactive call and any cells that will err."
Base.@kwdef struct TopologicalOrder
	input_topology::NotebookTopology
	"Cells that form a directed acyclic graph, in topological order."
	runnable::Array{Cell,1}
	"Cells that are in a directed cycle, with corresponding `ReactivityError`s."
	errable::Dict{Cell,ReactivityError}
end
