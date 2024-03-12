module OperationalTransform

import Pinot
import Pinot: Range, to_obj

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

function to_dict(update::Update)
    Dict{String,Any}(
        "ops" => Pinot.to_obj(update.ops),
        "document_length" => update.document_length,
        "client_id" => update.client_id,
        "effects" => update.effects,
    )
end

function initial_updates(code)
    Pinot.Range[Pinot.insert(code)]
end

end # module OperationalTransform
