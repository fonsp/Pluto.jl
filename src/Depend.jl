module Vars
export dependent, dependencies


const modifiers = [:(=), :+=, :-=, :*=, :/=] # TODO: anything else?


function dependent(ast::Expr)
    if ast.head in modifiers
        return ast.args[1]
    end
    return nothing
end


function dependencies(ast::Expr)
    used_args = []
    if ast.head in modifiers # only right-hand side matters
        used_args = ast.args[2:end]
    else # both sides matter
        used_args = ast.args[1:end]
    end
    return vcat([dependencies(arg) for arg in used_args]...)
end


dependencies(symbol::Symbol) = Base.isidentifier(symbol) ? [symbol] : []
dependencies(sth::Any) = []

end