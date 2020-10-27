###
# TREE VIEWER
###

# We invent our own MIME _because we can_ but don't use it somewhere else because it might change :)

module TreeViewer

import ..Formatting: show_richest
import Base: show, istextmime

export show_struct

const tree_display_limit = 50

function show_array_row(io::IO, pair::Tuple)
    i, element = pair
    print(io, "<r><k>", i, "</k><v>")
    show_richest(io, element; onlyhtml=true)
    print(io, "</v></r>")
end

function show_array_elements(io::IO, indices::AbstractVector{<:Integer}, x::AbstractArray{<:Any, 1})
    for i in indices
        if isassigned(x, i)
            show_array_row(io, (i, x[i]))
        else
            show_array_row(io, (i, Text(Base.undef_ref_str)))
        end
    end
end

function show_dict_row(io::IO, pair::Union{Pair,Tuple})
    k, element = pair
    print(io, "<r><k>")
    if pair isa Pair
        show_richest(io, k; onlyhtml=true)
    else
        # this is an entry of a NamedTuple, the first element of the Tuple is a Symbol, which we want to print as `x` instead of `:x`
        print(io, k)
    end
    print(io, "</k><v>")
    show_richest(io, element; onlyhtml=true)
    print(io, "</v></r>")
end

istextmime(::MIME"application/vnd.pluto.tree+xml") = true

function array_prefix(io, x::Array{<:Any, 1})
    print(io, eltype(x))
end
function array_prefix(io, x)
    original = sprint(Base.showarg, x, false)
    print(io, lstrip(original, ':'))
    print(io, ": ")
end

Base.showable(::MIME"application/vnd.pluto.tree+xml", x::AbstractRange) = false

function show(io::IO, ::MIME"application/vnd.pluto.tree+xml", x::AbstractArray{<:Any, 1})
    print(io, """<jltree class="collapsed" onclick="onjltreeclick(this, event)">""")
    array_prefix(io, x)
    print(io, "<jlarray>")
    indices = eachindex(x)

    if length(x) <= tree_display_limit
        show_array_elements(io, indices, x)
    else
        firsti = firstindex(x)
        from_end = tree_display_limit > 20 ? 10 : 1

        show_array_elements(io, indices[firsti:firsti-1+tree_display_limit-from_end], x)
        
        print(io, "<r><more></more></r>")
        
        show_array_elements(io, indices[end+1-from_end:end], x)
    end
    
    print(io, "</jlarray>")
    print(io, "</jltree>")
end

function show(io::IO, ::MIME"application/vnd.pluto.tree+xml", x::Tuple)
    print(io, """<jltree class="collapsed" onclick="onjltreeclick(this, event)">""")
    print(io, """<jlarray class="Tuple">""")
    show_array_row.([io], zip(eachindex(x), x))
    print(io, "</jlarray>")
    print(io, "</jltree>")
end

function show(io::IO, ::MIME"application/vnd.pluto.tree+xml", x::AbstractDict{<:Any, <:Any})
    print(io, """<jltree class="collapsed" onclick="onjltreeclick(this, event)">""")
    print(io, typeof(x) |> trynameof)
    print(io, "<jldict>")
    row_index = 1
    for pair in x
        show_dict_row(io, pair)
        if row_index == tree_display_limit
            print(io, "<r><more></more></r>")
            break
        end
        row_index += 1
    end
    
    print(io, "</jldict>")
    print(io, "</jltree>")
end

function show(io::IO, ::MIME"application/vnd.pluto.tree+xml", x::NamedTuple)
    print(io, """<jltree class="collapsed" onclick="onjltreeclick(this, event)">""")
    print(io, """<jldict class="NamedTuple">""")
    show_dict_row.([io], zip(eachindex(x), x))
    print(io, "</jldict>")
    print(io, "</jltree>")
end

function show(io::IO, ::MIME"application/vnd.pluto.tree+xml", x::Pair)
    print(io, """<jlpair>""")
    show_dict_row(io, x)
    print(io, "</jlpair>")
end



# Based on Julia source code, but HTML-ified
function show_struct(io::IO, @nospecialize(x))
    t = typeof(x)
    nf = nfields(x)
    nb = sizeof(x)
    if nf != 0 || nb == 0
        print(io, """<jltree class="collapsed" onclick="onjltreeclick(this, event)">""")
        show(io, t)
        print(io, "<jlstruct>")
        
        if !Base.show_circular(io, x)
            recur_io = IOContext(io, Pair{Symbol,Any}(:SHOWN_SET, x),
                                 Pair{Symbol,Any}(:typeinfo, Any))
            for i in 1:nf
                f = fieldname(t, i)
                if !isdefined(x, f)
                    print(io, "<r>", Base.undef_ref_str, "</r>")
                else
                    show_array_row(recur_io, (f, getfield(x, i)))
                end
            end
        end

        print(io, "</jlstruct>")
        print(io, "</jltree>")
    else
        Base.show_default(io, x)
    end
end

trynameof(x::DataType) = nameof(x)
trynameof(x::Any) = Symbol()

end