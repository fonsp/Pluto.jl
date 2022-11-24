
begin
    """
    ```julia
    ImmutableSet{T}(xs::Set{T})
    ```
    
    Wraps around, and behaves like a regular `Set`, but mutating operations (like `push!` or `empty!`) are not allowed.
    
    When called on a set, a *shallow copy* of the set is stored. This means that it's fine to mutate the input set after creating an `ImmutableSet` from it. To prevent this, call `ImmutableSet(xs; skip_copy=true)`.
    """
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
    Base.setdiff(s::ImmutableSet, i...) = ImmutableSet(setdiff(s.c, i...))
end

begin
    """
    ```julia
    ImmutableVector{T}(xs::Vector{T})
    ```
    
    Wraps around, and behaves like a regular `Vector`, but mutating operations (like `push!` or `setindex!`) are not allowed.
    
    When called on a vector, a *shallow copy* of the vector is stored. This means that it's fine to mutate the input vector after creating an `ImmutableVector` from it. To prevent this, call `ImmutableVector(xs; skip_copy=true)`.
    """
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

begin
    """
    ```julia
    ImmutableDefaultDict{K,V}(default::Function, container::Dict{K,V})
    ```
    
    Wraps around, and behaves like a regular `Dict`, but if a key is not found, it will call return `default()`.
    """
    struct ImmutableDefaultDict{K,V} <: AbstractDict{K,V}
        default::Union{Function,DataType}
        container::Dict{K,V}
    end

    ImmutableDefaultDict{K,V}(default::Union{Function,DataType}) where {K,V} = ImmutableDefaultDict{K,V}(default, Dict{K,V}())

    function Base.getindex(aid::ImmutableDefaultDict{K,V}, key::K)::V where {K,V}
        get!(aid.default, aid.container, key)
    end
    function Base.merge(a1::ImmutableDefaultDict{K,V}, a2::ImmutableDefaultDict{K,V}) where {K,V}
        isempty(a2) ? a1 : ImmutableDefaultDict{K,V}(a1.default, merge(a1.container, a2.container))
    end
    function Base.merge(a1::ImmutableDefaultDict{K,V}, a2::AbstractDict) where {K,V}
        isempty(a2) ? a1 : ImmutableDefaultDict{K,V}(a1.default, merge(a1.container, a2))
    end
    # disabled because it's immutable!
    # Base.setindex!(aid::ImmutableDefaultDict{K,V}, args...) where {K,V} = Base.setindex!(aid.container, args...)
    # Base.delete!(aid::ImmutableDefaultDict{K,V}, args...) where {K,V} = Base.delete!(aid.container, args...)
    delete_unsafe!(aid::ImmutableDefaultDict{K,V}, args...) where {K,V} = Base.delete!(aid.container, args...)
    Base.copy(aid::ImmutableDefaultDict{K,V}) where {K,V} = ImmutableDefaultDict{K,V}(aid.default, copy(aid.container))
    Base.keys(aid::ImmutableDefaultDict) = Base.keys(aid.container)
    Base.values(aid::ImmutableDefaultDict) = Base.values(aid.container)
    Base.length(aid::ImmutableDefaultDict) = Base.length(aid.container)
    Base.iterate(aid::ImmutableDefaultDict, args...) = Base.iterate(aid.container, args...)
end

"""
```julia
setdiffkeys(d::Dict{K,V}, key_itrs...)::Dict{K,V}
```

Apply `setdiff` on the keys of a dictionary.

# Example
```julia
setdiffkeys(Dict(1 => "one", 2 => "two", 3 => "three"), [1, 3])
# result: `Dict(2 => "two")`
```
"""
setdiffkeys(d::Dict{K,V}, key_itrs...) where {K,V} = Dict{K,V}(k => d[k] for k in setdiff(keys(d), key_itrs...))
setdiffkeys(d::ImmutableDefaultDict{K,V}, key_itrs...) where {K,V} = ImmutableDefaultDict{K,V}(d.default, setdiffkeys(d.container, key_itrs...))
