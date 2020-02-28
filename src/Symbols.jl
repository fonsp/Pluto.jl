module Symbols
export modified, referenced


const modifiers = [:(=), :+=, :-=, :*=, :/=] # TODO: anything else?


# TODO: doesn't work for things like "x=1;y=2" yet
"The symbols whose values are modified in the expression"
function modified(ast::Expr)
    if ast.head in modifiers
        if typeof(ast.args[1]) == Symbol # otherwise lambdas get treated as assignments too
            return [ast.args[1]]
        end
    end
    return []
end

modified(code::String) = modified(Meta.parse(code))
modified(thing::Any) = []


# TODO: doesn't ignore local scope variables
"The symbols whose values are read in the expression"
function referenced(ast::Expr)
    used_args = []
    if ast.head in modifiers # only right-hand side matters
        used_args = ast.args[2:end]
    else
        used_args = ast.args[1:end]
    end
    return vcat([referenced(arg) for arg in used_args]...)
end

referenced(symbol::Symbol) = Base.isidentifier(symbol) ? [symbol] : []
referenced(sth::Any) = []

referenced(code::String) = referenced(Meta.parse(code))


end