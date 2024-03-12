module Delta
# References
# https://github.com/codemirror/collab/blob/main/src/collab.ts
# https://codemirror.net/examples/collab/
# https://github.com/livebook-dev/livebook/blob/main/lib/livebook/delta.ex
# https://www.npmjs.com/package/quill-delta

using ..OperationalTransform: ChangeSpec, Update, Insertion, Deletion, Replacement

# "CodeMirror change spec which is not ideal to manipulate"
# struct ChangeSpec
#     from::Int
#     to::Int
#     insert::String
# end

# struct SelectionRange
#     head::Int
#     anchor::Int
# end
# 
# struct EditorSelection
#     main::Int
#     ranges::Vector{SelectionRange}
# end
# 
# struct Update
#     specs::Vector{ChangeSpec}
#     document_length::Int
#     client_id::String
#     effects::Vector{EditorSelection}
# end

function retain!(ranges,n)
    if !isempty(ranges) && last(ranges).type == Retain
        ranges[end] = retain(ranges[end].length + n)
    else
        push!(ranges, retain(n))
    end
    ranges
end

@enum RangeType Insert Retain Delete

struct Range
    type::RangeType
    length::UInt32
    insert::Union{Nothing,String} # for inserts
end

retain(l) = Range(Retain, l, nothing)
insert(s) = Range(Insert, 0, s)
delete(l) = Range(Delete, l, nothing)

function make_specs(ranges::Vector{Range})
    specs = ChangeSpec[]
    offset = 0

    # TODO: compact subsequent Delete & Insert into a Replacement
    for range in ranges 
        if range.type == Retain
            offset += range.length
        elseif range.type == Delete
            push!(specs, Deletion(offset, offset + range.length))
        elseif range.type == Insert
            push!(specs, Insertion(offset, range.insert::String))
        end
    end

    specs
end

function ranges(update::Update)
    ranges = Range[]

    specs = update.specs
    offset = 0 # offset to apply to spec changes
    current_pos = 0 # current position of the head

    for spec in specs
        from = offset + spec.from

        if from != current_pos
            push!(ranges, retain(from - current_pos))
            current_pos = from
        end

        if spec isa Deletion
            to = offset + spec.to
            push!(ranges, delete(to - from))
            offset -= to - from
            current_pos -= to - from - 1
        elseif spec isa Insertion
            push!(ranges, insert(0, spec.insert))
            offset += sizeof(spec.insert)
            current_pos += sizeof(spec.insert) - 1
        elseif spec isa Replacement
            to = offset + spec.to
            push!(ranges,
                delete(to - from),
                insert(spec.insert))
            offset -= to - from
            offset += sizeof(spec.insert)
            current_pos += to - from
        end
    end

    if current_pos < update.document_length
        retain!(ranges, update.document_length - current_pos)
    end

    ranges
end

# Given `a` and `b`
# S - a -> Sa - b -> Sb
# Produce a change set `c` such that
# applying `c` to S gives `Sb`
# S - c -> Sb
function compose(a, b)
    out = Range[]

    i = firstindex(a)
    j = firstindex(b)

    ca = a[i]
    cb = b[j]

    while i <= lastindex(a) &&
            j <= lastindex(b)

        if ca.type == Insert && cb.type == Retain

            push!(out,)
        end
    end

    out
end

struct OpIterator
    r::Vector{Range}
    i::UInt32 # op index
    ℓ::UInt32 # consumed length in r[i]
end
OpIterator(r) = OpIterator(r, firstindex(r), zero(UInt32))

function peek_length(it::OpIterator)
    it.i > lastindex(it.r) && return typemax(UInt32)
    op = it.r[it.i]
    op.length - it.ℓ
end
function peek_type(it::OpIterator)
    it.i > lastindex(it.r) && return Retain
    op = it.r[it.i]
    op.type
end

function has_next(it::OpIterator)
    it.i <= lastindex(it.r)
end

function next(it::OpIterator, ℓ=nothing)
    it.i > lastindex(it.r) && return Range(Retain, typemax(UInt32), nothing), it
    op = it.r[it.i]
    if op.type == Insert
        @assert isnothing(ℓ)
        return Range(Insert, op.length, op.insert), OpIterator(it.r, it.i+one(UInt32), zero(UInt32))
    end
    ty = op.type
    ℓ  = isnothing(ℓ) ? ℓ : peek_length(it)
    ni, nℓ = it.i, it.ℓ+ℓ
    r = Range(ty, ℓ, nothing)
    if it.ℓ + ℓ == op.length # move to next
        ni += 1
        nℓ = 0
    end
    r, OpIterator(it.r, ni, nℓ)
end

# S ∘ A
# S ∘ B
# S ∘ A ∘ transform(a, b, :left) ==
#   S ∘ B ∘ transform(b, a, :right)
# text = ""
# apply(apply(text, rA), transform(rA,rB,:left)) ==
# apply(apply(text, rB), transform(rB,rA,:left))
function transform(a, b, priority)
    out = Range[]

    @assert priority ∈ (:left, :right)
    before = priority == :left

    itA = OpIterator(a)
    itB = OpIterator(b)

    while has_next(itA) || has_next(itB)
        if peek_type(itA) == Insert && (before || peek_type(itB) != Insert)
            ca, itA = next(itA)
            retain!(out, sizeof(ca.insert))
        elseif peek_type(itB) == Insert
            cb, itB = next(itB)
            push!(out, cb)
        else
            # ca, cb are either Retain or Delete
            ℓ = min(peek_length(itA), peek_length(itB))

            if peek_type(itA) == Delete
                # our delete either makes their delete redundant or removes their retain
            elseif peek_type(itB) == Delete
                push!(out, delete(ℓ))
            else
                # ca and cb are Retain
                retain!(out, ℓ)
            end

            _, itA = next(itA, ℓ)
            _, itB = next(itB, ℓ)
        end
    end

    out
end


# `updates` corresponds to updates created by the client but not yet synced
# and `over`, a list of updates that happened since the last client sync
#
# The main is to `reduce` the changes in `over` in one big change by composing
# and then and then transform/map the updates over it.
function rebase(updates, over)
    changes = foldl(
        # assert here that other was not produced by the client submitting
        # updates.
        compose, over)

    map(updates) do update
        updateChanges = transform(update, changes)
        changes = transform(changes, update, :right)
        effects = transform_effects(update.effects, changes),

        Update(changes, effects, update.client_id)
    end
end

function apply(s::String, ranges::Vector{Range})
    out = AbstractString[]
    current_pos = firstindex(s)

    for r in ranges
        if r.type == Retain
            push!(out, @view s[current_pos:current_pos+r.length-1])
            current_pos += r.length
        elseif r.type == Delete
            current_pos += r.length
        elseif r.type == Insert
            push!(out, r.insert)
        end
    end

    # retain the end
    if current_pos < sizeof(s)
        push!(out, @view s[current_pos:end])
    end

    join(out)
end

#=

pos is 1 indexed

if we have a delete

ok|
retain(1), delete(1)

o|
=#
function transform_position(ops::Vector{Range}, pos)
    # offset is current position in delta.
    offset = 0
    for op in ops
        offset >= pos && return pos

        if op.type == Insert
            # in case of insert, position is reduced from
            # the length of the insert.
            # BUT, if the position will be within the inserted
            # range. We put it at offset (our current position in delta).
            #
            # Consider
            # hello|
            # retain(3), insert("lo ge"), retain(2) -> "hello gello"
            #
            # hel|lo gello
            #   ^offset
            pos = max(pos - op.length, offset)
        elseif op.type == Retain
            # does not affect position
            offset += op.length
        elseif op.type == Insert
            # affects both position and offset in delta
            pos += op.length
            offset += op.length
        end
    end

    pos
end

export apply, ranges, Range, Delete, Retain, Insert, transform

end # module Delta
