
# We invent our own MIME _because we can_ but don't use it somewhere else because it might change :)
pluto_showable(::MIME"application/vnd.pluto.tree+object", x::AbstractVector{<:Any}) = try eltype(eachindex(x)) === Int; catch; false; end
pluto_showable(::MIME"application/vnd.pluto.tree+object", ::AbstractSet{<:Any}) = true
pluto_showable(::MIME"application/vnd.pluto.tree+object", ::AbstractDict{<:Any,<:Any}) = true
pluto_showable(::MIME"application/vnd.pluto.tree+object", ::Tuple) = true
pluto_showable(::MIME"application/vnd.pluto.tree+object", ::NamedTuple) = true
pluto_showable(::MIME"application/vnd.pluto.tree+object", ::Pair) = true

pluto_showable(::MIME"application/vnd.pluto.tree+object", ::AbstractRange) = false

pluto_showable(::MIME"application/vnd.pluto.tree+object", ::Any) = false


# in the next functions you see a `context` argument
# this is really only used for the circular reference tracking

const Context = IOContext{IOBuffer}

function tree_data_array_elements(@nospecialize(x::AbstractVector{<:Any}), indices::AbstractVector{I}, context::Context) where {I<:Integer}
    Tuple{I,Any}[
        if isassigned(x, i)
            i, format_output_default(x[i], context)
        else
            i, format_output_default(Text(Base.undef_ref_str), context)
        end
        for i in indices
    ] |> collect
end
precompile(tree_data_array_elements, (Vector{Any}, Vector{Int}, Context))

function array_prefix(@nospecialize(x::Vector{<:Any}))
    string(eltype(x))::String
end

function array_prefix(@nospecialize(x))
    original = sprint(Base.showarg, x, false; context=:limit => true)
    string(lstrip(original, ':'), ": ")::String
end

function get_my_display_limit(@nospecialize(x), dim::Integer, depth::Integer, context::Context, a::Integer, b::Integer)::Int # needs to be system-dependent Int because it is used as array index
    let
        if depth < 3
            a ÷ (1 + 2 * depth)
        else
            0
        end
    end + let
        d = get(context, :extra_items, nothing)
        if d === nothing
            0
        else
            b * get(d, (objectid(x), dim), 0)
        end
    end
end

objectid2str(@nospecialize(x)) = string(objectid(x); base=16)::String

function circular(@nospecialize(x))
    return Dict{Symbol,Any}(
        :objectid => objectid2str(x),
        :type => :circular
    )
end

function tree_data(@nospecialize(x::AbstractSet{<:Any}), context::Context)
    if Base.show_circular(context, x)
        return circular(x)
    else
        depth = get(context, :tree_viewer_depth, 0)
        recur_io = IOContext(context, Pair{Symbol,Any}(:SHOWN_SET, x), Pair{Symbol,Any}(:tree_viewer_depth, depth + 1))

        my_limit = get_my_display_limit(x, 1, depth, context, tree_display_limit, tree_display_limit_increase)

        L = min(my_limit+1, length(x))
        elements = Vector{Any}(undef, L)
        index = 1
        for value in x
            if index <= my_limit
                elements[index] = (index, format_output_default(value, recur_io))
            else
                elements[index] = "more"
                break
            end
            index += 1
        end

        Dict{Symbol,Any}(
            :prefix => string(typeof(x)),
            :prefix_short => string(typeof(x) |> trynameof),
            :objectid => objectid2str(x),
            :type => :Set,
            :elements => elements
        )
    end
end

function tree_data(@nospecialize(x::AbstractVector{<:Any}), context::Context)
    if Base.show_circular(context, x)
        return circular(x)
    else
        depth = get(context, :tree_viewer_depth, 0)::Int
        recur_io = IOContext(context, Pair{Symbol,Any}(:SHOWN_SET, x), Pair{Symbol,Any}(:tree_viewer_depth, depth + 1))

        indices = eachindex(x)
        my_limit = get_my_display_limit(x, 1, depth, context, tree_display_limit, tree_display_limit_increase)

        # additional couple of elements so that we don't cut off 1 or 2 itmes - that's silly
        elements = if length(x) <= ((my_limit * 6) ÷ 5)
            tree_data_array_elements(x, indices, recur_io)
        else
            firsti = firstindex(x)
            from_end = my_limit > 20 ? 10 : my_limit > 1 ? 1 : 0
            Any[
                tree_data_array_elements(x, indices[firsti:firsti-1+my_limit-from_end], recur_io);
                "more";
                tree_data_array_elements(x, indices[end+1-from_end:end], recur_io)
            ]
        end

        prefix = array_prefix(x)
        Dict{Symbol,Any}(
            :prefix => prefix,
            :prefix_short => x isa Vector ? "" : prefix, # if not abstract
            :objectid => objectid2str(x),
            :type => :Array,
            :elements => elements
        )
    end
end

function tree_data(@nospecialize(x::Tuple), context::Context)
    depth = get(context, :tree_viewer_depth, 0)
    recur_io = IOContext(context, Pair{Symbol,Any}(:tree_viewer_depth, depth + 1))

    elements = Tuple[]
    for val in x
        out = format_output_default(val, recur_io)
        push!(elements, out)
    end
    Dict{Symbol,Any}(
        :objectid => objectid2str(x),
        :type => :Tuple,
        :elements => collect(enumerate(elements)),
    )
end

function tree_data(@nospecialize(x::AbstractDict{<:Any,<:Any}), context::Context)
    if Base.show_circular(context, x)
        return circular(x)
    else
        depth = get(context, :tree_viewer_depth, 0)
        recur_io = IOContext(context, Pair{Symbol,Any}(:SHOWN_SET, x), Pair{Symbol,Any}(:tree_viewer_depth, depth + 1))

        elements = []

        my_limit = get_my_display_limit(x, 1, depth, context, tree_display_limit, tree_display_limit_increase)
        row_index = 1
        for pair in x
            k, v = pair
            if row_index <= my_limit
                push!(elements, (format_output_default(k, recur_io), format_output_default(v, recur_io)))
            else
                push!(elements, "more")
                break
            end
            row_index += 1
        end

        Dict{Symbol,Any}(
            :prefix => string(typeof(x)),
            :prefix_short => string(typeof(x) |> trynameof),
            :objectid => objectid2str(x),
            :type => :Dict,
            :elements => elements
        )
    end
end

function tree_data_nt_row(@nospecialize(pair::Tuple), context::Context)
    # this is an entry of a NamedTuple, the first element of the Tuple is a Symbol, which we want to print as `x` instead of `:x`
    k, element = pair
    string(k), format_output_default(element, context)
end


function tree_data(@nospecialize(x::NamedTuple), context::Context)
    depth = get(context, :tree_viewer_depth, 0)
    recur_io = IOContext(context, Pair{Symbol,Any}(:tree_viewer_depth, depth + 1))

    elements = Tuple[]
    for key in eachindex(x)
        val = x[key]
        data = tree_data_nt_row((key, val), recur_io)
        push!(elements, data)
    end
    Dict{Symbol,Any}(
        :objectid => objectid2str(x),
        :type => :NamedTuple,
        :elements => elements
    )
end

function tree_data(@nospecialize(x::Pair), context::Context)
    k, v = x
    Dict{Symbol,Any}(
        :objectid => objectid2str(x),
        :type => :Pair,
        :key_value => (format_output_default(k, context), format_output_default(v, context)),
    )
end

# Based on Julia source code but without writing to IO
function tree_data(@nospecialize(x::Any), context::Context)
    if Base.show_circular(context, x)
        return circular(x)
    else
        depth = get(context, :tree_viewer_depth, 0)
        recur_io = IOContext(context, 
            Pair{Symbol,Any}(:SHOWN_SET, x),
            Pair{Symbol,Any}(:typeinfo, Any),
            Pair{Symbol,Any}(:tree_viewer_depth, depth + 1),
            )

        t = typeof(x)
        nf = nfields(x)
        nb = sizeof(x)

        elements = Any[
            let
                f = fieldname(t, i)
                if !isdefined(x, f)
                    Base.undef_ref_str
                    f, format_output_default(Text(Base.undef_ref_str), recur_io)
                else
                    f, format_output_default(getfield(x, i), recur_io)
                end
            end
            for i in 1:nf
        ]

        Dict{Symbol,Any}(
            :prefix => repr(t; context),
            :prefix_short => string(trynameof(t)),
            :objectid => objectid2str(x),
            :type => :struct,
            :elements => elements,
        )
    end

end

function trynameof(::Type{Union{T,Missing}}) where T
    name = trynameof(T)
    return name === Symbol() ? name : Symbol(name, "?")
end
trynameof(x::DataType) = nameof(x)
trynameof(x::Any) = Symbol()
