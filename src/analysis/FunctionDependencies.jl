module FunctionDependencies

const dependency_table = Dict{Symbol,Symbol}(
    :√ => :sqrt,
    :adjoint => :conj,
    :< => :isless,
    :> => :<,
    :isgreater => :isless,
    :ismore => :>,
    :≥ => :(>=),
    :≤ => :(<=),
    :min => :isless,
    :max => :isless,
    :cmp => :isless,
    :isequal => :(==),
    :(!=) => :(==),
    :≠ => :(!=),
    :(!==) => :(===),
    :≢ => :(!==),
    :≡ => :(===),
    :⊻ => :xor,
    :⊼ => :nand,
    :⊽ => :nor,
    :% => :rem,
    :÷ => :div,
    :mod1 => :mod,
    :∈ => :in,
)

maybe_add_dependent_funccall!(funccalls::Set{Symbol}, ::Nothing) = funccalls
function maybe_add_dependent_funccall!(funccalls::Set{Symbol}, call)
    push!(funccalls, call)
    maybe_add_dependent_funccall!(funccalls, get(dependency_table, call, nothing))
    funccalls
end

function maybe_add_dependent_funccalls!(funccalls::Set{Symbol})
    calls_to_add = intersect(keys(dependency_table), funccalls)
    for call in calls_to_add
        maybe_add_dependent_funccall!(funccalls, dependency_table[call])
    end
    funccalls
end

end
