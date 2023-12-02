import ExpressionExplorer: SymbolsState, FunctionName

"Information container about the cells to run in a reactive call and any cells that will err."
Base.@kwdef struct TopologicalOrder{C <: AbstractCell}
	input_topology::NotebookTopology
	"Cells that form a directed acyclic graph, in topological order."
	runnable::Vector{C}
	"Cells that are in a directed cycle, with corresponding `ReactivityError`s."
	errable::Dict{C,ReactivityError}
end
