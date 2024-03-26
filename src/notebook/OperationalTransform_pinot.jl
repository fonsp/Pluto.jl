module OperationalTransform

import Pinot
using Pinot: Range, to_obj

struct SelectionRange
    head::Int
    anchor::Int
end

struct EditorSelection
    main::Int
    ranges::Vector{SelectionRange}
end

struct Update
    ops::Vector{Pinot.Range}
    document_length::Int
    client_id::String
    effects::Vector{EditorSelection}
end

function Base.convert(::Type{Update}, data::Dict)
    effects = map(data["effects"]) do effect
        EditorSelection(
            effect["main"],
            map(
                range ->
                    SelectionRange(range["head"], range["anchor"]),
                effect["ranges"]
            )
        )
    end

    ranges = Pinot.from_obj(data)
    return Update(ranges, data["document_length"], data["client_id"], effects)
end

function apply(text, updates)
    for update in updates
        text = Pinot.apply(text, update.ops)
    end
    text
end

function to_dict(update::Update)
    Dict{String,Any}(
        "ops" => Pinot.to_obj(update.ops),
        "document_length" => update.document_length,
        "client_id" => update.client_id,
        "effects" => update.effects,
    )
end

function initial_updates(code)
    Update[Update(Pinot.Range[Pinot.insert(code)], 0, "pluto_init", [])]
end

end # module OperationalTransform
