import .ExpressionExplorer: UsingsImports, SymbolsState

"A container for the result of parsing the cell code, with some extra metadata."
Base.@kwdef struct ExprAnalysisCache
    code::String=""
    parsedcode::Expr=Expr(:toplevel, LineNumberNode(1), Expr(:block))
    module_usings_imports::UsingsImports = UsingsImports()
    function_wrapped::Bool=false
    forced_expr_id::Union{PlutoRunner.ObjectID,Nothing}=nothing
end

ExprAnalysisCache(notebook, cell::Cell) = let
    parsedcode=parse_custom(notebook, cell)
    ExprAnalysisCache(
        code=cell.code,
        parsedcode=parsedcode,
        module_usings_imports=ExpressionExplorer.compute_usings_imports(parsedcode),
        function_wrapped=ExpressionExplorer.can_be_function_wrapped(parsedcode),
    )
end

function ExprAnalysisCache(old_cache::ExprAnalysisCache; new_properties...)
    properties = Dict{Symbol,Any}(field => getproperty(old_cache, field) for field in fieldnames(ExprAnalysisCache))
    merge!(properties, Dict{Symbol,Any}(new_properties))
    ExprAnalysisCache(;properties...)
end

begin
	struct ImmutableSet{T} <: AbstractSet{T}
		c::Set{T}
		ImmutableSet{T}(s::Set{T}; skip_copy::Bool=false) where T = new{T}(skip_copy ? s : copy(s))
	end
	ImmutableSet(s::Set{T}; skip_copy::Bool=false) where T = ImmutableSet{T}(s; skip_copy)
	
	ImmutableSet(arg) = let
		s = Set(arg)
		ImmutableSet{eltype(s)}(s; skip_copy=true)
	end
	ImmutableSet{T}() where T = ImmutableSet{T}(Set{T}(); skip_copy=true)
	ImmutableSet() = ImmutableSet(Set(); skip_copy=true)

	Base.copy(s::ImmutableSet) = ImmutableSet(copy(s.c))
	Base.in(x, s::ImmutableSet) = Base.in(x, s.c)
	Base.isempty(s::ImmutableSet) = Base.isempty(s.c)
	Base.length(s::ImmutableSet) = Base.length(s.c)
	Base.iterate(s::ImmutableSet, i...) = Base.iterate(s.c, i...)
end

begin
	struct ImmutableVector{T} <: AbstractVector{T}
		c::Vector{T}
		ImmutableVector{T}(x; skip_copy::Bool=false) where T = new{T}(skip_copy ? x : copy(x))
	end
	ImmutableVector(x::AbstractVector{T}; kwargs...) where T = ImmutableVector{T}(x; kwargs...)
	ImmutableVector{T}() where T = ImmutableVector{T}(Vector{T}())

	Base.copy(s::ImmutableVector) = ImmutableVector(copy(s.c))
	Base.in(x, s::ImmutableVector) = Base.in(x, s.c)
	Base.isempty(s::ImmutableVector) = Base.isempty(s.c)
	Base.length(s::ImmutableVector) = Base.length(s.c)
	Base.size(s::ImmutableVector) = Base.size(s.c)
	Base.iterate(s::ImmutableVector, i...) = Base.iterate(s.c, i...)
	Base.getindex(s::ImmutableVector, i::Integer) = Base.getindex(s.c, i)
	Base.getindex(s::ImmutableVector, i...) = ImmutableVector(Base.getindex(s.c, i...))
    delete_unsafe!(s::ImmutableSet, args...) = Base.delete!(s.c, args...)
end

struct DefaultDict{K,V} <: AbstractDict{K,V}
    default::Union{Function,DataType}
    container::Dict{K,V}
end

"The (information needed to create the) dependency graph of a notebook. Cells are linked by the names of globals that they define and reference. 🕸"
Base.@kwdef struct NotebookTopology
    nodes::DefaultDict{Cell,ReactiveNode} = DefaultDict{Cell,ReactiveNode}(ReactiveNode)
    codes::DefaultDict{Cell,ExprAnalysisCache}=DefaultDict{Cell,ExprAnalysisCache}(ExprAnalysisCache)
    cell_order::ImmutableVector{Cell} # must be given

    unresolved_cells::ImmutableSet{Cell} = ImmutableSet{Cell}()
end

# BIG TODO HERE: CELL ORDER
all_cells(topology::NotebookTopology) = topology.cell_order.c

is_resolved(topology::NotebookTopology) = isempty(topology.unresolved_cells)

function set_unresolved(topology::NotebookTopology, unresolved_cells::Vector{Cell})
    codes = Dict{Cell,ExprAnalysisCache}(
        cell => ExprAnalysisCache(topology.codes[cell]; function_wrapped=false, forced_expr_id=nothing)
        for cell in unresolved_cells
    )
    NotebookTopology(
        nodes=topology.nodes, 
        codes=merge(topology.codes, codes), 
        unresolved_cells=union(topology.unresolved_cells, unresolved_cells),
        cell_order = topology.cell_order,
    )
end

DefaultDict{K,V}(default::Union{Function,DataType}) where {K,V} = DefaultDict{K,V}(default, Dict{K,V}())

function Base.getindex(aid::DefaultDict{K,V}, key::K)::V where {K,V}
    get!(aid.default, aid.container, key)
end
function Base.merge(a1::DefaultDict{K,V}, a2::DefaultDict{K,V}) where {K,V}
    DefaultDict{K,V}(a1.default, merge(a1.container, a2.container))
end
function Base.merge(a1::DefaultDict{K,V}, a2::AbstractDict) where {K,V}
    DefaultDict{K,V}(a1.default, merge(a1.container, a2))
end
Base.setindex!(aid::DefaultDict{K,V}, args...) where {K,V} = Base.setindex!(aid.container, args...)
Base.delete!(aid::DefaultDict{K,V}, args...) where {K,V} = Base.delete!(aid.container, args...)
delete_unsafe!(aid::DefaultDict{K,V}, args...) where {K,V} = Base.delete!(aid.container, args...)
Base.keys(aid::DefaultDict) = Base.keys(aid.container)
Base.values(aid::DefaultDict) = Base.values(aid.container)
Base.length(aid::DefaultDict) = Base.length(aid.container)
Base.iterate(aid::DefaultDict, args...) = Base.iterate(aid.container, args...)
