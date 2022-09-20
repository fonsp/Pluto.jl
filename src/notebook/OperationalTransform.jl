"""
This module implements the tools needed to be the central authority described in
the code-mirror collab demonstration (https://codemirror.net/examples/collab/).
"""
module OperationalTransform

abstract type ChangeSpec end

struct Insertion <: ChangeSpec
    from::Int
    insert::String
end

struct Replacement <: ChangeSpec
    from::Int
    to::Int
    insert::String
end

struct Deletion <: ChangeSpec
    from::Int
    to::Int
end

struct Update
    specs::Vector{ChangeSpec}
    document_length::Int
    client_id::String
end

struct Text
    content::String
end
Base.length(t::Text) = Base.length(t.content)
Base.String(t::Text) = t.content

struct InvalidDocumentLengthError
    msg
end

function apply(text::Text, update::Update)
    if Base.length(text) != update.document_length
        throw(InvalidDocumentLengthError("Invalid update document length $(update.document_length), document is $(length(text))"))
    end

    offset = 0
    for change in update.specs
        display(change)
        text = apply(text, shift_diff(change, offset))
        offset += diff_offset(change)
    end
    return text
end

"""
Apply an offset for the edit.
"""
shift_diff(deletion::Deletion, offset) = Deletion(deletion.from + offset, deletion.to + offset)
shift_diff(replacement::Replacement, offset) = Replacement(replacement.from + offset, replacement.to + offset, replacement.insert)
shift_diff(deletion::Insertion, offset) = Insertion(deletion.from + offset, deletion.insert)

"""
Computes the offset created by this change spec
so that the next change spec can be applied as a
new change.
"""
function diff_offset(deletion::Deletion)
    deletion.from - deletion.to
end
function diff_offset(replacement::Replacement)
    length(replacement.insert) - (replacement.to - replacement.from)
end
function diff_offset(insertion::Insertion)
    length(insertion.insert)
end

# TODO: test and use unicode code units
function apply(text::Text, insertion::Insertion)
    content = text.content
    new_content = @view(content[begin:insertion.from]) * insertion.insert * @view(content[insertion.from+1:end])
    return Text(new_content)
end

function apply(text::Text, replacement::Replacement)
    content = text.content
    new_content = @view(content[begin:replacement.from]) * replacement.insert * @view(content[replacement.to+1:end])
    return Text(new_content)
end

function apply(text::Text, deletion::Deletion)
    content = text.content
    new_content = @view(content[begin:deletion.from]) * @view(content[deletion.to+1:end])
    return Text(new_content)
end

function Base.convert(::Type{Update}, data::Dict)
    specs = data["specs"]
    specs = map(specs) do spec
        from = spec["from"]
        if haskey(spec, "insert")
            Replacement(from, get(spec, "to", from), spec["insert"])
        else
            Deletion(from, spec["to"])
        end
    end
    Update(specs, data["document_length"], data["client_id"])
end

# Eye candy
function Base.show(io::IO, insertion::Insertion)
    printstyled(io, "+[", insertion.from, "]", "\"", insertion.insert, "\"", color=:green)
end
function Base.show(io::IO, replacement::Replacement)
    printstyled(io, "~[", replacement.from, ":", replacement.to, "]", "\"", replacement.insert, "\"", color=:orange)
end
function Base.show(io::IO, deletion::Deletion)
    printstyled(io, "~[", deletion.from, ":", deletion.to, "]"; color=:red)
end

#=
module TestOperationalTransform
import ..OperationalTransform: Replacement, Deletion, Text, Update, apply

import Test: @test
import JSON3

update_data = JSON3.read(
    """
    {"specs": [{"from":1,"to":4,"insert":"pizzapo"}], "document_length": 10,"client_id": "random"}
    """)
specs = map(update_data["specs"]) do data
    from = data["from"]
    if haskey(data, "insert")
        Replacement(from, get(data, "to", from), data["insert"])
    else
        Deletion(from, data["to"])
    end
end

update = Update(
    specs,
    update_data["document_length"],
    update_data["client_id"]
)
text = Text("iiiiiiiiii")
new_text = apply(text, update)

@test String(new_text) == "ipizzapoiiiiii"
end
=#

end # module OperationalTransform
