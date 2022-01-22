import { syntaxTree, Facet, ViewPlugin, Decoration, StateField, EditorView, EditorSelection, EditorState } from "../../imports/CodemirrorPlutoSetup.js"
import { ctrl_or_cmd_name, has_ctrl_or_cmd_pressed } from "../../common/KeyboardShortcuts.js"
import _ from "../../imports/lodash.js"
import { as_node, as_string, child_cursors, create_specific_template_maker, jl, narrow, t, take_little_piece_of_template, template } from "./lezer_template.js"

/**
 * @typedef TreeCursor
 * @type {import("../../imports/CodemirrorPlutoSetup.js").TreeCursor}
 */

/**
 * @typedef SyntaxNode
 * @type {TreeCursor["node"]}
 */

// let asd = template(jl`${t.as("prefix")}${t.as("string", t.String)}`)
// let to_match = jl`X"asd"`
// console.log(`as_string(to_match):`, as_string(to_match))
// let match = asd.match(as_node(to_match))
// console.log(`match:`, match)
// throw "N"

/**
 * This function work bottom up: you give it an identifier, and it will look at it parents to figure out what it is...
 * Ideally we use the top-down approach for everything, like we do in `explore_variable_usage`.
 */
let node_is_variable_usage = (node) => {
    let parent = node.parent

    if (parent == null) return false
    if (parent.name === "VariableDeclarator") return false
    if (parent.name === "Symbol") return false

    // If we are the first child of a FieldExpression, we are the usage
    if (parent.name === "FieldExpression" || parent.name === "MacroFieldExpression") {
        let firstchild = parent.firstChild
        if (node.from === firstchild?.from && node.to === firstchild?.to) {
            return true
        } else {
            return false
        }
    }

    // Ignore left side of an assigment
    // TODO Tuple assignment
    if (parent.name === "AssignmentExpression") {
        let firstchild = parent?.firstChild
        if (node.from === firstchild?.from && node.to === firstchild?.to) {
            return false
        }
    }

    // If we are the name of a macro of function definition, we are not usage
    if (parent.name === "MacroDefinition" || parent.name === "FunctionDefinition") {
        let function_name = parent?.firstChild?.nextSibling
        if (node.from === function_name?.from && node.to === function_name?.to) {
            return false
        }
    }

    if (parent.name === "ArgumentList") {
        if (parent.parent.name === "MacroDefinition" || parent.parent.name === "FunctionDefinition") {
            return false
        }
    }

    if (parent.name === "Type") {
        return true
    }

    if (parent.name === "TypedExpression") return node_is_variable_usage(parent)
    if (parent.name === "NamedField") return node_is_variable_usage(parent)
    if (parent.name === "BareTupleExpression") return node_is_variable_usage(parent)

    return true
}

/**
 * @typedef Range
 * @property {number} from
 * @property {number} to
 *
 * @typedef ScopeState
 * @property {Set<{
 *  usage: Range,
 *  definition: Range | null,
 *  name: string,
 * }>} usages
 * @property {Map<String, Range>} definitions
 */

/**
 * @param {ScopeState} a
 * @param {ScopeState} b
 * @returns {ScopeState}
 */
let merge_scope_state = (a, b) => {
    if (a === b) return a

    let usages = new Set([...a.usages, ...b.usages])
    let definitions = new Map(a.definitions)
    for (let [key, value] of b.definitions) {
        definitions.set(key, value)
    }
    return { usages, definitions }
}

/**
 * @param {TreeCursor} cursor
 * @returns {Array<SyntaxNode>}
 */
let get_variables_from_assignment = (cursor) => {
    if (cursor.name === "Definition") {
        if (cursor.firstChild()) {
            try {
                return get_variables_from_assignment(cursor)
            } finally {
                cursor.parent()
            }
        }
    }

    if (cursor.name === "Identifier") {
        return [cursor.node]
    }
    // `function f(x...)` => ["x"]
    // `x... = 10` => ["x"]
    if (cursor.name === "SpreadExpression") {
        if (cursor.firstChild()) {
            try {
                return get_variables_from_assignment(cursor)
            } finally {
                cursor.parent()
            }
        }
    }
    // `function f(x = 10)` => ["x"]
    // First need to go into NamedArgument, then need to go into NamedField.
    if (cursor.name === "NamedArgument" || cursor.name === "NamedField") {
        if (cursor.firstChild()) {
            try {
                return get_variables_from_assignment(cursor)
            } finally {
                cursor.parent()
            }
        }
    }
    // `function f(x::Any)` => ["x"]
    // `x::Any = 10` => ["x"]
    if (cursor.name === "TypedExpression") {
        if (cursor.firstChild()) {
            try {
                return get_variables_from_assignment(cursor)
            } finally {
                cursor.parent()
            }
        }
    }
    // `function f( (x,y) )` => ["x", "y"]
    // `(x, y) = arr` => ["x", "y"]
    // `x,y = arr` => ["x", "y"]
    if (cursor.name === "TupleExpression" || cursor.name === "BareTupleExpression") {
        let variables = []
        if (cursor.firstChild()) {
            do {
                variables.push(...get_variables_from_assignment(cursor))
            } while (cursor.nextSibling())
            cursor.parent()
        }
        return variables
    }
    return []
}

/** @param {TreeCursor} cursor */
let search_for_interpolations = function* (cursor) {
    for (let child of child_cursors(cursor)) {
        if (child.name === "InterpolationExpression") {
            yield cursor
        } else {
            yield* search_for_interpolations(cursor)
        }
    }
}
/** @param {TreeCursor} cursor */
let go_through_quoted_expression_looking_for_interpolations = function* (cursor) {
    if (cursor.name !== "QuoteExpression" && cursor.name !== "QuoteStatement") throw new Error("Expected QuotedExpression or QuoteStatement")
    yield* search_for_interpolations(cursor)
}

let for_binding_template = (for_binding_ast) => {
    let meta_template = template(jl`[i for i in i ${t.as("content", t.anything_that_fits(jl`for x in y`))}]`)
    return take_little_piece_of_template(jl`[i for i in i ${for_binding_ast}]`, meta_template)
}

let assignment_template = (assigment_ast) => {
    let argument_meta_template = template(jl`${t.as("content")} = nothing`)
    return take_little_piece_of_template(jl`${assigment_ast} = nothing`, argument_meta_template)
}

let function_definition_argument_template = (argument) => {
    let argument_meta_template = template(jl`function f(${t.as("content")}) end`)
    return take_little_piece_of_template(jl`function f(${argument}) end`, argument_meta_template)
}

let function_call_argument_template = (argument) => {
    let meta_template = template(jl`f(${t.as("content")})`)
    return take_little_piece_of_template(jl`f(${argument})`, meta_template)
}

/**
 * @param {TreeCursor | SyntaxNode} cursor
 * @param {any} doc
 * @param {ScopeState} scopestate
 * @param {boolean?} verbose
 * @returns {ScopeState}
 */
let explorer_function_argument = (cursor, doc, scopestate, verbose = false) => {
    let match = null

    if ((match = function_definition_argument_template(jl`${t.as("subject", t.Identifier)}`).match(cursor))) {
        return scopestate_add_definition(scopestate, doc, cursor)
    }
    // `function f(x...)` => ["x"]
    else if ((match = function_definition_argument_template(jl`${t.as("subject", t.any)}...`).match(cursor))) {
        console.log(`match:`, match)
        return explorer_pattern(match.subject, doc, scopestate, verbose)
    }

    // `function f(x = 10)` => ["x"]
    else if ((match = function_definition_argument_template(jl`${t.as("name", t.any)} = ${t.as("value", t.any)}`).match(cursor))) {
        let { name, value } = match
        console.log(`name, value:`, name, value)
        scopestate = explorer_pattern(name, doc, scopestate, verbose)
        scopestate = explore_variable_usage(value.cursor, doc, scopestate, verbose)
        return scopestate
    } else if ((match = function_definition_argument_template(jl`${t.as("name", t.any)}::${t.as("type", t.any)}`).match(cursor))) {
        let { name, type } = match
        console.log(`name, type:`, name, type)
        scopestate = explorer_pattern(name, doc, scopestate, verbose)
        scopestate = explore_variable_usage(type.cursor, doc, scopestate, verbose)
        return scopestate
    } else {
        console.warn("UNKNOWN FUNCTION ARGUMENT:", cursor.toString())
        return scopestate
    }
}

/**
 * @param {TreeCursor | SyntaxNode} cursor
 * @param {any} doc
 * @param {ScopeState} scopestate
 * @param {boolean?} verbose
 * @returns {ScopeState}
 */
let explorer_pattern = (cursor, doc, scopestate, verbose = false) => {
    let match = null

    if ((match = assignment_template(jl`${t.as("subject", t.Identifier)}`).match(cursor))) {
        return scopestate_add_definition(scopestate, doc, cursor)
    }
    // `x... = 10` => ["x"]
    else if ((match = assignment_template(jl`${t.as("subject", t.any)}...`).match(cursor))) {
        console.log(`match:`, match)
        return explorer_pattern(match.subject, doc, scopestate, verbose)
    } else if ((match = assignment_template(jl`${t.as("name", t.any)}::${t.as("returntype", t.any)}`).match(cursor))) {
        let { name, returntype } = match
        scopestate = explorer_pattern(name, doc, scopestate, verbose)
        scopestate = explore_variable_usage(returntype.cursor, doc, scopestate, verbose)
        return scopestate
    } else if ((match = function_definition_argument_template(jl`${t.as("name", t.any)} = ${t.as("value", t.any)}`).match(cursor))) {
        let { name, value } = match
        console.log(`match:`, match)
        scopestate = explorer_pattern(name, doc, scopestate, verbose)
        scopestate = explore_variable_usage(value.cursor, doc, scopestate, verbose)
        return scopestate
    } else {
        console.warn("UNKNOWN PATTERN:", cursor.toString())
        return scopestate
    }
}

/**
 * Explores the definition part of a struct or such.
 * Takes care of defining that actual name, defining type parameters,
 * and using all the types used.
 *
 * It returns an inner and an outer scope state.
 * The inner scope state is for code "inside" the struct, which has access to the implicitly created types.
 * Outer scope is only the actual defined name, so will always exist of just one definition and no usages.
 * This distinction is so the created types don't escape outside the struct.
 * Usages all go in the inner scope.
 *
 * @param {TreeCursor} cursor
 * @param {any} doc
 * @param {ScopeState} scopestate
 * @param {boolean} [verbose]
 * @returns {{ inner: ScopeState, outer: ScopeState }}
 */
let explore_definition = function (cursor, doc, scopestate, verbose = false) {
    let match = null
    if (cursor.name === "Definition" && cursor.firstChild()) {
        try {
            return explore_definition(cursor, doc, scopestate)
        } finally {
            cursor.parent()
        }
    } else if (cursor.name === "Identifier") {
        scopestate = scopestate_add_definition(scopestate, doc, cursor)
        return { inner: scopestate, outer: scopestate }
    } else if ((match = template(jl`${t.as("subject")}{ ${t.many("parameters")} }`).match(cursor))) {
        // A{B}
        let { subject, parameters } = match
        let outer = fresh_scope()
        if (subject) {
            let subject_explored = explore_definition(subject.cursor, doc, scopestate)
            outer = subject_explored.outer
            scopestate = subject_explored.inner
        }
        for (let { node: parameter } of parameters) {
            // Yes, when there is a type parameter in the definition itself (so not after `::`),
            // it implies a new type parameter being implicitly instanciated.
            let { inner: parameter_inner } = explore_definition(parameter.cursor, doc, scopestate)
            scopestate = parameter_inner
        }
        return { inner: scopestate, outer: outer }
    } else if ((match = template(jl`${t.as("subject")} <: ${t.as("type")}`).match(cursor))) {
        let { subject, type } = match
        let outer = fresh_scope()
        if (subject) ({ outer, inner: scopestate } = explore_definition(subject.cursor, doc, scopestate))

        if (type) scopestate = merge_scope_state(scopestate, explore_variable_usage(type.cursor, doc, scopestate))
        return { inner: scopestate, outer: scopestate }
    } else {
        throw new Error(`Unknown thing in definition: "${doc.sliceString(cursor.from, cursor.to)}", "${cursor.toString()}"`)
        // return scopestate
    }
}

/**
 * @returns {ScopeState}
 */
let fresh_scope = () => {
    return {
        usages: new Set(),
        definitions: new Map(),
    }
}

/**
 * Currently this clones a scope state, except for the usages.
 * The reason is skips the usages is a premature optimisation.
 * We don't need them in the inner scope, but we just as well could leave them on
 * (as they won't do any harm either way)
 *
 * @param {ScopeState} scopestate
 * @returns {ScopeState}
 */
let lower_scope = (scopestate) => {
    return {
        usages: new Set(),
        definitions: new Map(scopestate.definitions),
    }
}

/**
 * For use in combination with `lower_scope`.
 * This will take an inner scope and merge only the usages into the outer scope.
 * So we see the usages of the inner scope, but the definitions don't exist in the outer scope.
 *
 * @param {ScopeState} nested_scope
 * @param {ScopeState} scopestate
 * @returns {ScopeState}
 */
let raise_scope = (nested_scope, scopestate) => {
    return {
        usages: new Set([...scopestate.usages, ...nested_scope.usages]),
        definitions: scopestate.definitions,
    }
}

/**
 * @param {ScopeState} scopestate
 * @param {any} doc
 * @param {SyntaxNode | TreeCursor} node
 */
let scopestate_add_definition = (scopestate, doc, node) => {
    scopestate.definitions.set(doc.sliceString(node.from, node.to), {
        from: node.from,
        to: node.to,
    })
    return scopestate
}

/**
 * @param {TreeCursor} cursor
 * @param {any} doc
 * @param {ScopeState} scopestate
 * @returns {ScopeState}
 */
let explore_variable_usage = (
    cursor,
    doc,
    scopestate = {
        usages: new Set(),
        definitions: new Map(),
    },
    verbose = false
) => {
    let start_node = null
    if (verbose) {
        verbose && console.group(`Explorer: ${cursor.toString()}`)
        verbose && console.log("Full text:", doc.sliceString(cursor.from, cursor.to))
        start_node = cursor.node
    }
    try {
        let match = null
        if (cursor.name === "Symbol") {
            // Nothing, ha!
            return scopestate
        } else if (
            (match = template(jl`
                struct ${t.as("defined_as")}
                    ${t.many("expressions", t.any)}
                end
            `).match(cursor)) ??
            (match = template(jl`
                mutable struct ${t.as("defined_as")}
                    ${t.many("expressions", t.any)}
                end
            `).match(cursor))
        ) {
            let { defined_as, expressions } = match
            defined_as = narrow(defined_as)

            let inner_scope = lower_scope(scopestate)
            let outer_scope = fresh_scope()

            if (defined_as) ({ inner: inner_scope, outer: outer_scope } = explore_definition(defined_as.cursor, doc, inner_scope))

            // Struct body
            for (let { node: expression } of expressions) {
                if (cursor.name === "Identifier") {
                    // Nothing, this is just the name inside the struct blegh get it out of here
                } else if ((match = template(jl`${t.as("subject")}::${t.as("type")}`).match(expression))) {
                    // We're in X::Y, and Y is a reference
                    let { subject, type } = match
                    inner_scope = merge_scope_state(inner_scope, explore_variable_usage(type.cursor, doc, inner_scope))
                } else if ((match = template(jl`${t.as("assignee")} = ${t.as("value")}`).match(expression))) {
                    let { assignee, value } = match

                    // Yeah... we do the same `a::G` check again
                    if ((match = template(jl`${t.as("subject")}::${t.as("type")}`).match(assignee))) {
                        let { subject, type } = match
                        inner_scope = merge_scope_state(inner_scope, explore_variable_usage(type.cursor, doc, inner_scope))
                    }
                    inner_scope = merge_scope_state(inner_scope, explore_variable_usage(value.cursor, doc, inner_scope))
                }
            }

            scopestate = raise_scope(inner_scope, scopestate)
            scopestate = merge_scope_state(scopestate, outer_scope)
            return scopestate
        } else if ((match = template(jl`abstract type ${t.as("name")} end`).match(cursor))) {
            let { name } = match
            if (name) ({ outer: scopestate } = explore_definition(name.cursor, doc, scopestate))
        } else if (
            (match = template(jl`quote ${t.many("body", t.any)} end`).match(cursor)) ??
            (match = template(jl`:(${t.many("body", t.any)})`).match(cursor))
        ) {
            // We don't use the match because I made `go_through_quoted_expression_looking_for_interpolations`
            // to take a cursor at the quoted expression itself
            for (let interpolation_cursor of go_through_quoted_expression_looking_for_interpolations(cursor)) {
                scopestate = merge_scope_state(scopestate, explore_variable_usage(interpolation_cursor, doc, scopestate))
            }
            return scopestate
        } else if (
            (match = template(jl`
                module ${t.as("name", t.any)}
                    ${t.many("expressions", t.any)}
                end
            `).match(cursor))
        ) {
            let { name, expressions } = match

            if (name) scopestate = scopestate_add_definition(scopestate, doc, name)

            let module_scope = fresh_scope()
            for (let { node: expression } of expressions) {
                module_scope = merge_scope_state(module_scope, explore_variable_usage(expression.cursor, doc, module_scope))
            }
            // We still merge the module scopestate with the global scopestate, but only the usages that don't escape.
            // (Later we can have also shadowed definitions for the dimming of unused variables)
            scopestate = merge_scope_state(scopestate, {
                usages: new Set(Array.from(module_scope.usages).filter((x) => x.definition != null)),
                definitions: new Map(),
            })
        } else if (
            (match = template(jl`
                begin
                    ${t.many("expressions")}
                end
            `).match(cursor))
        ) {
            for (let { node: expression } of match.expressions) {
                scopestate = merge_scope_state(scopestate, explore_variable_usage(expression.cursor, doc, scopestate))
            }
            return scopestate
        } else if ((match = template(jl`${t.as("prefix")}${t.as("string", t.String)}`).match(cursor))) {
            // This one is also a bit enigmatic, but `t.String` renders in the template as `"..."`,
            // so the template with match things that look like `prefix"..."`
            let { prefix, string } = match
            let prefix_string = doc.sliceString(prefix.from, prefix.to)

            if (prefix_string === "var") {
                let name = doc.sliceString(string.from + 1, string.to - 1)
                if (name.length !== 0) {
                    scopestate.usages.add({
                        name: name,
                        usage: {
                            from: cursor.from,
                            to: cursor.to,
                        },
                        definition: scopestate.definitions.get(name) ?? null,
                    })
                }
                return scopestate
            } else {
                let name = `@${prefix_string}_str`
                scopestate.usages.add({
                    name: name,
                    usage: {
                        from: prefix.from,
                        to: prefix.to,
                    },
                    definition: scopestate.definitions.get(name) ?? null,
                })
            }
            return scopestate
        } else if ((match = template(jl`var${t.as("string", t.String)}`).match(cursor))) {
            // TODO Ideally the code above would be here, but right now the templating never
            // .... actually checks for text... so the `var` above is interpreted as "any prefix"....
            return scopestate // Still have this for typescript, but code will never reach this point
        } else if ((match = template(jl`${t.Number}${t.as("unit")}`).match(cursor))) {
            let { unit } = match
            scopestate = merge_scope_state(scopestate, explore_variable_usage(unit.cursor, doc, scopestate))
            return scopestate
        } else if (
            (match = template(jl`import ${t.many("specifiers", t.any)}`).match(cursor)) ??
            // Only match `using X: ...`, because these have exported names I can see.
            // Normal `using X` is handled below.
            (match = template(jl`using ${t.any}: ${t.many("specifiers", t.any)}`).match(cursor))
        ) {
            let { specifiers } = match

            let import_specifier_template = (argument) => {
                let meta_template = template(jl`import ${t.as("content")}`)
                return take_little_piece_of_template(jl`import ${argument}`, meta_template)
            }
            // Apparently there is a difference between the `X as Y` in `import X as Y` and `import P: X as Y`
            // This template is specifically for `import P: X as Y`.
            let very_specific_import_specifier_template = (argument) => {
                let meta_template = template(jl`import X: ${t.as("content")}`)
                return take_little_piece_of_template(jl`import X: ${argument}`, meta_template)
            }

            let add_import_specifier = (scopestate, doc, specifier) => {
                let match = null
                if ((match = import_specifier_template(jl`${t.as("name")} as ${t.as("alias")}`).match(specifier))) {
                    let { name, alias } = match
                    return scopestate_add_definition(scopestate, doc, alias)
                } else if ((match = very_specific_import_specifier_template(jl`${t.as("name")} as ${t.as("alias")}`).match(specifier))) {
                    let { name, alias } = match
                    return scopestate_add_definition(scopestate, doc, alias)
                } else if ((match = import_specifier_template(jl`${t.as("name", t.Identifier)}`).match(specifier))) {
                    let { name } = match
                    return scopestate_add_definition(scopestate, doc, name)
                } else if ((match = import_specifier_template(jl`.${t.as("name")}`).match(specifier))) {
                    // ScopedIdentifier, eg `import .X`
                    // We don't care about this for `import .X: z` or `import .X as Y`
                    // but in this case it hides the actual name from us!
                    let { name: identifier } = match
                    // This is done manually because I have been templating for a while and I really can't be bothered to figure out how to do this nice and template-y

                    let original_identifier = identifier
                    while (identifier.name === "ScopedIdentifier") {
                        identifier = identifier.firstChild
                    }

                    if (identifier.name === "Identifier") {
                        return scopestate_add_definition(scopestate, doc, identifier)
                    } else {
                        console.warn("Something odd going on with ScopedIdentifiers", original_identifier.toString())
                    }
                } else {
                    console.warn("Unrecognized import specifier", specifier.toString())
                    return scopestate
                }
            }

            for (let { node: specifier } of specifiers) {
                if ((match = import_specifier_template(jl`${t.as("external")}: ${t.many("locals")}`).match(specifier))) {
                    for (let { node: local } of match.locals) {
                        scopestate = add_import_specifier(scopestate, doc, local)
                    }
                } else if ((match = import_specifier_template(jl`${t.as("package")}.${t.as("name", t.Identifier)}`).match(specifier))) {
                    scopestate = scopestate_add_definition(scopestate, doc, match.name)
                } else {
                    scopestate = add_import_specifier(scopestate, doc, specifier)
                }
            }
            return scopestate
        } else if ((match = template(jl`using ${t.many()}`).match(cursor))) {
            // Can't care less
            return scopestate
        } else if (
            (match = template(jl`
            for ${t.many("bindings", t.something_with_the_same_type_as(jl`x in y`))};
                ${t.many("expressions")}
            end
        `).match(cursor))
        ) {
            let for_loop_binding_template = create_specific_template_maker((arg) => jl`for ${arg}; x end`)

            console.log(`match:`, match)
            let { bindings, expressions } = match
            let inner_scope = lower_scope(scopestate)

            for (let { node: binding } of bindings) {
                let match = null
                if (
                    (match = for_loop_binding_template(jl`${t.as("name")} in ${t.as("range")}`).match(binding)) ??
                    (match = for_loop_binding_template(jl`${t.as("name")} ∈ ${t.as("range")}`).match(binding)) ??
                    (match = for_loop_binding_template(jl`${t.as("name")} = ${t.as("range")}`).match(binding))
                ) {
                    let { name, range } = match
                    if (range) inner_scope = explore_variable_usage(range.cursor, doc, inner_scope)
                    if (name) {
                        for (let variable_node of get_variables_from_assignment(name.cursor)) {
                            inner_scope = scopestate_add_definition(inner_scope, doc, variable_node)
                        }
                    }
                } else {
                    console.warn("Unrecognized for loop binding", binding.toString())
                }
            }

            for (let { node: expression } of expressions) {
                inner_scope = explore_variable_usage(expression.cursor, doc, inner_scope)
            }

            return raise_scope(inner_scope, scopestate)
        } else if (cursor.name === "DoClause" && cursor.firstChild()) {
            try {
                let nested_scope = {
                    usages: new Set(),
                    definitions: new Map(scopestate.definitions),
                }

                do {
                    // @ts-ignore
                    if (cursor.name === "DoClauseArguments" && cursor.firstChild()) {
                        // Don't ask me why, but currently `do (x, y)` is parsed as `DoClauseArguments(ArgumentList(x, y))`
                        // while an actual argumentslist, `do x, y` is parsed as `DoClauseArguments(BareTupleExpression(x, y))`
                        let did_go_on_level_deeper = cursor.name === "ArgumentList" && cursor.firstChild()
                        try {
                            for (let variable_node of get_variables_from_assignment(cursor)) {
                                let name = doc.sliceString(variable_node.from, variable_node.to)
                                nested_scope.definitions.set(name, {
                                    from: variable_node.from,
                                    to: variable_node.to,
                                })
                            }
                        } finally {
                            if (did_go_on_level_deeper) {
                                cursor.parent()
                            }
                            cursor.parent()
                        }
                    } else {
                        nested_scope = merge_scope_state(nested_scope, explore_variable_usage(cursor, doc, nested_scope))
                    }
                } while (cursor.nextSibling())

                scopestate = {
                    usages: new Set([...scopestate.usages, ...nested_scope.usages]),
                    definitions: scopestate.definitions,
                }
            } finally {
                cursor.parent()
            }
        } else if (cursor.name === "NamedField" && cursor.firstChild()) {
            try {
                // NamedField's in the wild indicate there is no assignment, just a property name
                if (cursor.nextSibling()) {
                    scopestate = merge_scope_state(scopestate, explore_variable_usage(cursor, doc, scopestate))
                }
            } finally {
                cursor.parent()
            }
        } else if (cursor.name === "FunctionDefinition" || cursor.name === "MacroDefinition") {
            let full_node = cursor.node
            if (cursor.firstChild()) {
                // Two things
                // 1. Add the function name to the current scope
                // 2. Go through the function in a nested scope

                try {
                    // @ts-ignore
                    // If we are at "function", skip it
                    if (cursor.name === "function") {
                        cursor.nextSibling()
                    }
                    let in_macro = false
                    // @ts-ignore
                    // If we are at "function", skip it
                    if (cursor.name === "macro") {
                        in_macro = true // So we add `@` to the name
                        cursor.nextSibling()
                    }
                    // @ts-ignore
                    // Function name, add to current scope
                    if (cursor.name === "Definition" && cursor.firstChild()) {
                        try {
                            if (cursor.name === "Identifier") {
                                let name = doc.sliceString(cursor.from, cursor.to)
                                if (in_macro) {
                                    name = `@${name}`
                                }
                                scopestate.definitions.set(name, { from: cursor.from, to: cursor.to })
                                cursor.nextSibling()
                            }
                        } finally {
                            cursor.parent()
                        }
                        cursor.nextSibling()
                    }

                    let nested_scope = {
                        usages: new Set(),
                        definitions: new Map(scopestate.definitions),
                    }

                    let type_parameters = full_node.getChild("TypeParameters")
                    if (type_parameters) {
                        nested_scope = parse_definitions(type_parameters.firstChild.cursor, doc, nested_scope)
                    }

                    // @ts-ignore
                    // Cycle through arguments
                    if (cursor.name === "ArgumentList" && cursor.firstChild()) {
                        try {
                            do {
                                // @ts-ignore
                                if (cursor.name === "NamedArgument" && cursor.firstChild()) {
                                    try {
                                        if (cursor.name === "NamedField" && cursor.firstChild()) {
                                            try {
                                                // First child is the name of the argument
                                                if (cursor.name === "TypedExpression" && cursor.firstChild()) {
                                                    try {
                                                        do {
                                                            // @ts-ignore
                                                            if (cursor.name === "Type") {
                                                                scopestate = merge_scope_state(scopestate, explore_variable_usage(cursor, doc, scopestate))
                                                            }
                                                        } while (cursor.nextSibling())
                                                    } finally {
                                                        cursor.parent()
                                                    }
                                                }
                                                for (let variable_node of get_variables_from_assignment(cursor)) {
                                                    let name = doc.sliceString(variable_node.from, variable_node.to)
                                                    nested_scope.definitions.set(name, {
                                                        from: variable_node.from,
                                                        to: variable_node.to,
                                                    })
                                                }

                                                // Next sibling is the default value
                                                if (cursor.nextSibling()) {
                                                    scopestate = merge_scope_state(scopestate, explore_variable_usage(cursor, doc, scopestate))
                                                }
                                            } finally {
                                                cursor.parent()
                                            }
                                        }
                                    } finally {
                                        cursor.parent()
                                    }
                                }

                                // @ts-ignore
                                if (cursor.name === "TypedExpression" && cursor.firstChild()) {
                                    try {
                                        do {
                                            // @ts-ignore
                                            if (cursor.name === "Type") {
                                                scopestate = merge_scope_state(scopestate, explore_variable_usage(cursor, doc, nested_scope))
                                            }
                                        } while (cursor.nextSibling())
                                    } finally {
                                        cursor.parent()
                                    }
                                }

                                for (let variable_node of get_variables_from_assignment(cursor)) {
                                    let name = doc.sliceString(variable_node.from, variable_node.to)
                                    nested_scope.definitions.set(name, {
                                        from: variable_node.from,
                                        to: variable_node.to,
                                    })
                                }
                            } while (cursor.nextSibling())
                        } finally {
                            cursor.parent()
                        }
                    }

                    cursor.nextSibling()

                    do {
                        nested_scope = merge_scope_state(nested_scope, explore_variable_usage(cursor, doc, nested_scope))
                    } while (cursor.nextSibling())

                    scopestate = {
                        usages: new Set([...scopestate.usages, ...nested_scope.usages]),
                        definitions: scopestate.definitions,
                    }
                } finally {
                    cursor.parent()
                }
            }
        } else if (
            (match = template(jl`
                let ${t.many("assignments", jl`${t.as("assignee", t.any)} = ${t.as("value", t.any)}`)}
                    ${t.many("body", t.any)}
                end
            `).match(cursor))
        ) {
            let { assignments = [], body = [] } = match
            let innerscope = lower_scope(scopestate)
            for (let {
                match: { assignee, value },
            } of assignments) {
                // Explorer lefthandside in inner scope
                for (let variable_node of get_variables_from_assignment(assignee.cursor)) {
                    innerscope = scopestate_add_definition(innerscope, doc, variable_node)
                }
                // Explorer righthandside in the outer scope
                if (value) scopestate = merge_scope_state(scopestate, explore_variable_usage(value.cursor, doc, scopestate))
            }
            // Explorer body in innerscope
            for (let { node: line } of body) {
                innerscope = merge_scope_state(innerscope, explore_variable_usage(line.cursor, doc, innerscope))
            }
            return raise_scope(innerscope, scopestate)
        } else if (cursor.name === "VariableDeclaration" || cursor.name === "AssignmentExpression") {
            if (cursor.firstChild()) {
                try {
                    for (let variable_node of get_variables_from_assignment(cursor)) {
                        let name = doc.sliceString(variable_node.from, variable_node.to)
                        scopestate.definitions.set(name, {
                            from: variable_node.from,
                            to: variable_node.to,
                        })
                    }
                    // explore the right-hand side of the assignment
                    if (cursor.nextSibling()) {
                        scopestate = merge_scope_state(scopestate, explore_variable_usage(cursor, doc, scopestate))
                    }
                } finally {
                    cursor.parent()
                }
            }
        } else if (cursor.name === "Identifier" || cursor.name === "MacroIdentifier") {
            if (node_is_variable_usage(cursor.node)) {
                let name = doc.sliceString(cursor.from, cursor.to)
                if (scopestate.definitions.has(name)) {
                    scopestate.usages.add({
                        name: name,
                        usage: {
                            from: cursor.from,
                            to: cursor.to,
                        },
                        definition: scopestate.definitions.get(name),
                    })
                } else {
                    scopestate.usages.add({
                        name: name,
                        usage: {
                            from: cursor.from,
                            to: cursor.to,
                        },
                        definition: null,
                    })
                }
            }
        } else if (
            // A bit hard to see from the template, but these are array (and generator) comprehensions
            // e.g. [x for x in y]
            (match = template(jl`[
                ${t.as("result", t.any)}
                ${t.many("clauses", t.anything_that_fits(jl`for x = y`))}
            ]`).match(cursor)) ??
            // Are there syntax differences between Array or Generator expressions?
            // For now I treat them the same...
            // (Also this is one line because lezer doesn't parse multiline generator expressions yet)
            (match = template(jl`(${t.as("result", t.any)} ${t.many("clauses", t.anything_that_fits(jl`for x = y`))})`).match(cursor))
        ) {
            let { result, clauses } = match

            let nested_scope = lower_scope(scopestate)

            // Because of the `t.anything_that_fits`, we can now match different `for x ? y`'s and `if x`s manually.
            // There might be a way to express this in the template, but this keeps templates a lot simpler yet powerful.
            for (let { node: for_binding } of clauses) {
                let match = null
                if (
                    (match = for_binding_template(jl`for ${t.as("variable", t.any)} = ${t.as("value", t.any)}`).match(for_binding)) ??
                    (match = for_binding_template(jl`for ${t.as("variable", t.any)} in ${t.as("value", t.any)}`).match(for_binding)) ??
                    (match = for_binding_template(jl`for ${t.as("variable", t.any)} ∈ ${t.as("value", t.any)}`).match(for_binding)) ??
                    (match = for_binding_template(jl`for ${t.as("variable", t.any)}`).match(for_binding))
                ) {
                    let { variable, value } = match

                    if (value) nested_scope = merge_scope_state(nested_scope, explore_variable_usage(value.cursor, doc, nested_scope))
                    if (variable) {
                        for (let variable_node of get_variables_from_assignment(variable.cursor)) {
                            nested_scope = scopestate_add_definition(nested_scope, doc, variable_node)
                        }
                    }
                } else if ((match = for_binding_template(jl`if ${t.as("if", t.any)}`).match(for_binding))) {
                    let { if: node } = match
                    if (node) nested_scope = merge_scope_state(nested_scope, explore_variable_usage(node.cursor, doc, nested_scope))
                } else {
                    console.log("Hmmm, can't parse for binding", for_binding)
                }
            }

            nested_scope = merge_scope_state(nested_scope, explore_variable_usage(result.cursor, doc, nested_scope))

            return raise_scope(nested_scope, scopestate)
        } else {
            // In most cases we "just" go through all the children separately
            verbose && console.log("Cycling through children of", cursor.name)
            for (let subcursor of child_cursors(cursor)) {
                scopestate = merge_scope_state(scopestate, explore_variable_usage(subcursor, doc, scopestate))
            }
        }

        if (verbose) {
            if (cursor.from !== start_node.from || cursor.to !== start_node.to) {
                console.log(`start_node:`, start_node.toString(), doc.sliceString(start_node.from, start_node.to))
                console.log(`cursor:`, cursor.toString(), doc.sliceString(cursor.from, cursor.to))
                throw new Error("Cursor is at a different node at the end of explore_variable_usage :O")
            }
        }

        return scopestate
    } finally {
        verbose && console.groupEnd()
    }
}

/**
 * @param {any} state
 * @param {{
 *  scopestate: ScopeState,
 *  used_variables: { [key: string]: boolean }
 * }} context
 */
let get_variable_marks = (state, { scopestate, used_variables }) => {
    return Decoration.set(
        Array.from(scopestate.usages)
            .map(({ definition, usage, name }) => {
                if (definition == null) {
                    // TODO variables_with_origin_cell should be notebook wide, not just in the current cell
                    // .... Because now it will only show variables after it has run once
                    if (used_variables[name]) {
                        return Decoration.mark({
                            // TODO This used to be tagName: "a", but codemirror doesn't like that...
                            // .... https://github.com/fonsp/Pluto.jl/issues/1790
                            // .... Ideally we'd change it back to `a` (feels better), but functionally there is no difference..
                            // .... When I ever happen to find a lot of time I can spend on this, I'll debug and change it back to `a`
                            tagName: "pluto-variable-link",
                            attributes: {
                                "title": `${ctrl_or_cmd_name}-Click to jump to the definition of ${name}.`,
                                "data-pluto-variable": name,
                                "href": `#${name}`,
                            },
                        }).range(usage.from, usage.to)
                    } else {
                        // This could be used to trigger @edit when clicked, to open
                        // in whatever editor the person wants to use.
                        // return Decoration.mark({
                        //     tagName: "a",
                        //     attributes: {
                        //         "title": `${ctrl_or_cmd_name}-Click to jump to the definition of ${text}.`,
                        //         "data-external-variable": text,
                        //         "href": `#`,
                        //     },
                        // }).range(usage.from, usage.to)
                        return null
                    }
                } else {
                    // Could be used to select the definition of a variable inside the current cell
                    return Decoration.mark({
                        tagName: "pluto-variable-link",
                        attributes: {
                            "title": `${ctrl_or_cmd_name}-Click to jump to the definition of ${name}.`,
                            "data-cell-variable": name,
                            "data-cell-variable-from": `${definition.from}`,
                            "data-cell-variable-to": `${definition.to}`,
                            "href": `#`,
                        },
                    }).range(usage.from, usage.to)
                    return null
                }
            })
            .filter((x) => x != null),
        true
    )
}

export const UsedVariablesFacet = Facet.define({
    combine: (values) => values[0],
    compare: _.isEqual,
})

/**
 * @type {StateField<ScopeState>}
 */
export let ScopeStateField = StateField.define({
    create(state) {
        try {
            let cursor = syntaxTree(state).cursor()
            let scopestate = explore_variable_usage(cursor, state.doc)
            return scopestate
        } catch (error) {
            console.error("Something went wrong while parsing variables...", error)
            return {
                usages: new Set(),
                definitions: new Map(),
            }
        }
    },

    update(value, tr) {
        try {
            if (tr.docChanged) {
                let cursor = syntaxTree(tr.state).cursor()
                let scopestate = explore_variable_usage(cursor, tr.state.doc)
                return scopestate
            } else {
                return value
            }
        } catch (error) {
            console.error("Something went wrong while parsing variables...", error)
            return {
                usages: new Set(),
                definitions: new Map(),
            }
        }
    },
})

export const go_to_definition_plugin = ViewPlugin.fromClass(
    class {
        /**
         * @param {EditorView} view
         */
        constructor(view) {
            let used_variables = view.state.facet(UsedVariablesFacet)
            this.decorations = get_variable_marks(view.state, {
                scopestate: view.state.field(ScopeStateField),
                used_variables,
            })
        }

        update(update) {
            // My best take on getting this to update when UsedVariablesFacet does 🤷‍♀️
            let used_variables = update.state.facet(UsedVariablesFacet)
            if (update.docChanged || update.viewportChanged || used_variables !== update.startState.facet(UsedVariablesFacet)) {
                this.decorations = get_variable_marks(update.state, {
                    scopestate: update.state.field(ScopeStateField),
                    used_variables,
                })
            }
        }
    },
    {
        decorations: (v) => v.decorations,

        eventHandlers: {
            pointerdown: (event, view) => {
                if (has_ctrl_or_cmd_pressed(event) && event.button === 0 && event.target instanceof Element) {
                    let pluto_variable = event.target.closest("[data-pluto-variable]")
                    if (pluto_variable) {
                        let variable = pluto_variable.getAttribute("data-pluto-variable")

                        event.preventDefault()
                        let scrollto_selector = `[id='${encodeURI(variable)}']`
                        document.querySelector(scrollto_selector).scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                        })

                        // TODO Something fancy where it counts going to definition as a page in history,
                        // .... so pressing/swiping back will go back to where you clicked on the definition.
                        // window.history.replaceState({ scrollTop: document.documentElement.scrollTop }, null)
                        // window.history.pushState({ scrollTo: scrollto_selector }, null)

                        let used_variables = view.state.facet(UsedVariablesFacet)

                        // TODO Something fancy where we actually emit the identifier we are looking for,
                        // .... and the cell then selects exactly that definition (using lezer and cool stuff)
                        if (used_variables[variable]) {
                            window.dispatchEvent(
                                new CustomEvent("cell_focus", {
                                    detail: {
                                        cell_id: used_variables[variable],
                                        line: 0, // 1-based to 0-based index
                                        definition_of: variable,
                                    },
                                })
                            )
                            return true
                        }
                    }

                    let cell_variable = event.target.closest("[data-cell-variable]")
                    if (cell_variable) {
                        let variable_name = cell_variable.getAttribute("data-cell-variable")
                        let variable_from = Number(cell_variable.getAttribute("data-cell-variable-from"))
                        let variable_to = Number(cell_variable.getAttribute("data-cell-variable-to"))

                        view.dispatch({
                            selection: { anchor: variable_from, head: variable_to },
                        })
                        view.focus()
                        return true
                    }
                }
            },
        },
    }
)
