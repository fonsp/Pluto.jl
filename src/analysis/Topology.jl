
"A container for the result of parsing the cell code, with some extra metadata."
Base.@kwdef struct ExprAnalysisCache
    code::String=""
    parsedcode::Expr=Expr(:block)
    module_usings::Set{Expr}=Set{Expr}()
    function_wrapped::Bool=false
end

ExprAnalysisCache(notebook, cell::Cell) = let
    parsedcode=parse_custom(notebook, cell)
    ExprAnalysisCache(
        code=cell.code,
        parsedcode=parsedcode,
        module_usings=ExpressionExplorer.compute_usings(parsedcode),
        function_wrapped=ExpressionExplorer.can_be_function_wrapped(parsedcode),
    )
end


struct DefaultDict{K,V} <: AbstractDict{K,V}
    default::Union{Function,DataType}
    container::Dict{K,V}
end


"The (information needed to create the) dependency graph of a notebook. Cells are linked by the names of globals that they define and reference. 🕸"
Base.@kwdef struct NotebookTopology
    nodes::DefaultDict{Cell,ReactiveNode} = DefaultDict{Cell,ReactiveNode}(ReactiveNode)
    codes::DefaultDict{Cell,ExprAnalysisCache}=DefaultDict{Cell,ExprAnalysisCache}(ExprAnalysisCache)
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
Base.setindex!(aid::DefaultDict, args...) = Base.setindex!(aid.container, args...)
Base.keys(aid::DefaultDict) = Base.keys(aid.container)
