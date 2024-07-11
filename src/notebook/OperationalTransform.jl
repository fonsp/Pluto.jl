"""
See [collab example](https://codemirror.net/examples/collab/) and [Pinot.jl](https://github.com/JuliaPluto/Pinot.jl).
"""
module OperationalTransform

using Pinot: Pinot, Unicode
using Pinot: Range, retain, delete, insert

struct SelectionRange
    head::UInt32
    anchor::UInt32
end

struct Selection
    main::UInt32 # zero-based index in `ranges`
    ranges::Vector{SelectionRange}
end

const Effect = Selection

struct Update
    client_id::Symbol
    document_length::Int
    ops::Vector{Pinot.Range}
    effects::Vector{Effect}
end

to_dict(u) = Dict{Symbol,Any}(:client_id => u.client_id,
                              :document_length => u.document_length,
                              :ops => Pinot.to_obj(u.ops)[:ops],
                              :effects => map(e -> Dict(:main => e.main, :ranges => map(r -> (; head=r.head, anchor=r.anchor), e.ranges)), u.effects))

from_dict(u) = Update(Symbol(u["client_id"]),
                      u["document_length"],
                      Pinot.from_obj(u),
                      haskey(u, "effects") ?  map(e -> Selection(e["main"], map(r -> SelectionRange(r["head"], r["anchor"]), e["ranges"])), u["effects"]) :
                                              Effect[])

function rebase(over, updates)
    isempty(over) && return updates
    # client is outdated, let's compose its changes and filter out changes from him
    # that were already accepted

    client_id = first(updates).client_id

    # let's imagine the list of updates here is:
    # [clientA, clientB, clientC] and we are accepting changes
    # from clientB. We need clientA and clientC, and remove
    # clientB from the upcoming list since it has already been applied.
    skip = 0
    changes = Pinot.Range[]
    for u in over
        if u.client_id == client_id # client_updates[begin+skip].client_id
            changes = Pinot.transform(u.ops, changes, Pinot.Right)
            skip += 1
        else
            changes = Pinot.compose(changes, u.ops)
        end
    end

    # changes = Pinot.compact(changes)
    @debug "received updates from outdated" skip changes over

    old_client_updates = @view updates[begin+skip:end]
    client_updates = Update[]
    for u in old_client_updates
        u_changes = Pinot.transform(changes, u.ops, Pinot.Left)

        new_length = Pinot.transform_position(changes, u.document_length)
        changes = Pinot.transform(u.ops, changes, Pinot.Right)

        new_effects = map(u.effects) do effect
            ranges = map(r -> SelectionRange(Pinot.transform_position(changes, r.head), Pinot.transform_position(changes, r.anchor)),
                                             effect.ranges)
            Selection(effect.main, ranges)
        end
        push!(client_updates, Update(u.client_id, new_length, u_changes, new_effects))
    end

    return client_updates
end

function apply(text, updates)
    # mapreduce(u -> u.ops, Pinot.apply, updates; init=text)
    for u in updates
        @assert Unicode.utf16_ncodeunits(text) == u.document_length (Unicode.utf16_ncodeunits(text), text, u.document_length)
        text = Pinot.apply(text, u.ops)
    end
    text
end

end # module OperationalTransform
