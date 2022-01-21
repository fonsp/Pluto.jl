import { syntaxTree, Facet, ViewPlugin, Decoration, StateField, EditorView } from "../../imports/CodemirrorPlutoSetup.js"
import { julia_ast, t, children, jl, template, take_little_piece_of_template } from "./julia_ast_template.js"
import { ctrl_or_cmd_name, has_ctrl_or_cmd_pressed } from "../../common/KeyboardShortcuts.js"
import _ from "../../imports/lodash.js"

/**
 * @typedef TreeCursor
 * @type {import("../../imports/CodemirrorPlutoSetup.js").TreeCursor}
 */

/**
 * @typedef SyntaxNode
 * @type {TreeCursor["node"]}
 */

/**
 * This function work bottom up: you give it an identifier, and it will look at it parents to figure out what it is...
 * Ideally we use the top-down approach for everything, like we do in `explore_variable_usage`.
 * @param {SyntaxNode} node
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

    if (parent.name === "TypedExpression") return node_is_variable_usage(parent)
    if (parent.name === "NamedField") return node_is_variable_usage(parent)
    if (parent.name === "BareTupleExpression") return node_is_variable_usage(parent)
    if (parent.name === "MacroIdentifier") return node_is_variable_usage(parent)

    return true
}

let empty_variables = []

/**
 * @typedef Range
 * @property {number} from
 * @property {number} to
 *
 * @typedef ScopeState
 * @property {Set<{ usage: Range, definition: Range? }>} usages
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
 * Clone scopestate
 * @param {ScopeState} scopestate
 * @returns {ScopeState}
 */
let clone_scope_state = (scopestate) => {
    let usages = new Set(scopestate.usages)
    let definitions = new Map(scopestate.definitions)
    return { usages, definitions }
}

/**
 * @param {TreeCursor} cursor
 * @returns {Array<Range>}
 */
let get_variables_from_assignment = (cursor) => {
    if (cursor.name === "Identifier") {
        return [{ to: cursor.to, from: cursor.from }]
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
    for (let child of children(cursor)) {
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

/**
 * @param {TreeCursor} cursor
 * @param {import("../../imports/CodemirrorPlutoSetup.js").Text} doc
 */
let inspect = (cursor, doc) => {
    let name = cursor.name
    let content = doc.sliceString(cursor.from, cursor.to)

    let _children = []
    for (let child of children(cursor)) {
        _children.push(inspect(child, doc))
    }

    return {
        type: name,
        content: children.length === 0 ? undefined : content,
        children: children,
    }
}

/**
 * @param {ScopeState} scopestate
 * @param {any} doc
 * @param {SyntaxNode | TreeCursor | TreeCursor} node
 */
let scopestate_add_definition = (scopestate, doc, node) => {
    scopestate.definitions.set(doc.sliceString(node.from, node.to), {
        from: node.from,
        to: node.to,
    })
    return scopestate
}

let assignment_template = (assigment_ast) => {
    let argument_meta_template = template(jl`${t.any("content")} = ${t.any()}`)
    return take_little_piece_of_template(jl`${assigment_ast} = nothing`, argument_meta_template)
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

    if ((match = assignment_template(jl`${t.Identifier("subject")}`).match(cursor))) {
        return scopestate_add_definition(scopestate, doc, cursor)
    }
    // `x... = 10` => ["x"]
    else if ((match = assignment_template(jl`${t.any("subject")}...`).match(cursor))) {
        console.log(`match:`, match)
        return explorer_pattern(match.subject, doc, scopestate, verbose)
    } else if ((match = assignment_template(jl`${t.any("name")}::${t.any("returntype")}`).match(cursor))) {
        let { name, returntype } = match
        scopestate = explorer_pattern(name, doc, scopestate, verbose)
        scopestate = explore_variable_usage(returntype.cursor, doc, scopestate, verbose)
        return scopestate
    } else if ((match = argument_template(jl`${t.any("name")} = ${t.any("value")}`).match(cursor))) {
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

let argument_template = (argument) => {
    let argument_meta_template = julia_ast`function f(${t.any("content")}) end`
    return take_little_piece_of_template(jl`function f(${argument}) end`, argument_meta_template)
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

    if ((match = argument_template(jl`${t.Identifier("subject")}`).match(cursor))) {
        return scopestate_add_definition(scopestate, doc, cursor)
    }
    // `function f(x...)` => ["x"]
    else if ((match = argument_template(jl`${t.any("subject")}...`).match(cursor))) {
        console.log(`match:`, match)
        return explorer_pattern(match.subject, doc, scopestate, verbose)
    }

    // `function f(x = 10)` => ["x"]
    else if ((match = argument_template(jl`${t.any("name")} = ${t.any("value")}`).match(cursor))) {
        let { name, value } = match
        scopestate = explorer_pattern(name, doc, scopestate, verbose)
        scopestate = explore_variable_usage(value.cursor, doc, scopestate, verbose)
        return scopestate
    } else if ((match = argument_template(jl`${t.any("name")}::${t.any("type")}`).match(cursor))) {
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
    if ("cursor" in cursor) {
        cursor = cursor.cursor
    }

    let start_node = null
    if (verbose) {
        verbose && console.group(`Explorer: ${cursor.toString()}`)
        verbose && console.log("Full text:", doc.sliceString(cursor.from, cursor.to))
        start_node = cursor.node
    }

    try {
        let match = null

        if (
            (match = julia_ast`struct ${t.any("defined_as")} ${t.multiple("expressions", t.any())} end`.match(cursor)) ??
            (match = julia_ast`mutable struct ${t.any("defined_as")} ${t.multiple("expressions", t.any())} end`.match(cursor))
        ) {
            let { defined_as, expressions } = match
            console.log(`match:`, match)
            // We're at the identifier (possibly ParameterizedIdentifier)
            if (defined_as.name === "Identifier") {
                let name = doc.sliceString(defined_as.from, defined_as.to)
                scopestate.definitions.set(name, {
                    from: defined_as.from,
                    to: defined_as.to,
                })
            } else if ((match = julia_ast`${t.any("subject")}{${t.multiple("parameters", t.any())}}`.match(defined_as))) {
                let { subject, parameters } = match
                scopestate_add_definition(scopestate, doc, subject)
                for (let parameter of parameters) {
                    scopestate = merge_scope_state(scopestate, explore_variable_usage(parameter.cursor, doc, scopestate))
                }
            } else if ((match = julia_ast`${t.any("subject")} <: ${t.any("type")}`.match(defined_as.cursor))) {
                let { subject, type } = match
                scopestate = merge_scope_state(scopestate, explore_variable_usage(type.cursor, doc, scopestate))
            }

            // Struct body
            for (let { node: expression } of expressions) {
                if (cursor.name === "Identifier") {
                    // Nothing, this is just the name inside the struct blegh get it out of here
                } else if ((match = julia_ast`<: ${t.any("type")}`.match(expression))) {
                    // Bug in lezer-julia where the typed part is part of the expressions
                    let { type } = match
                    scopestate = merge_scope_state(scopestate, explore_variable_usage(type.cursor, doc, scopestate))
                } else if ((match = julia_ast`${t.any("subject")}::${t.any("type")}`.match(expression))) {
                    // We're in X::Y, and Y is a reference
                    let { subject, type } = match
                    scopestate = merge_scope_state(scopestate, explore_variable_usage(type.cursor, doc, scopestate))
                } else if ((match = julia_ast`${t.any("assignee")} = ${t.any("value")}`.match(expression))) {
                    // I'm not so sure about this
                    let { assignee, value } = match

                    if ((match = julia_ast`${t.any("subject")}::${t.any("type")}`.match(assignee))) {
                        let { subject, type } = match
                        scopestate = merge_scope_state(scopestate, explore_variable_usage(type.cursor, doc, scopestate))
                    }

                    scopestate = merge_scope_state(scopestate, explore_variable_usage(value.cursor, doc, scopestate))
                }
            }
        } else if (cursor.name === "Symbol") {
            // Nothing, ha!
        } else if (
            (match = template(jl`abstract type ${t.any("name")} <: ${t.any("supertype")} end`).match(cursor)) ??
            (match = template(jl`abstract type ${t.any("name")} end`).match(cursor))
        ) {
            let { name, supertype } = match
            scopestate_add_definition(scopestate, doc, name)

            if (supertype != null) {
                scopestate = merge_scope_state(scopestate, explore_variable_usage(supertype.cursor, doc, scopestate))
            }
        } else if (
            (match = julia_ast`quote ${t.multiple("body", t.any())} end`.match(cursor)) ??
            (match = julia_ast`:(${t.multiple("body", t.any())})`.match(cursor))
        ) {
            // We don't use the match because I made `go_through_quoted_expression_looking_for_interpolations`
            // to take a cursor at the quoted expression itself
            for (let interpolation_cursor of go_through_quoted_expression_looking_for_interpolations(cursor)) {
                scopestate = merge_scope_state(scopestate, explore_variable_usage(interpolation_cursor, doc, scopestate))
            }
        } else if (
            (match = julia_ast`
                module ${t.Identifier("name")}
                    ${t.multiple("body", t.any())}
                end
            `.match(cursor))
        ) {
            let { name, body } = match
            scopestate_add_definition(scopestate, doc, name)

            /** @type {ScopeState} */
            let module_scopestate = {
                usages: new Set(),
                definitions: new Map(),
            }
            for (let { node: expression } of body) {
                module_scopestate = merge_scope_state(module_scopestate, explore_variable_usage(expression.cursor, doc, module_scopestate))
            }
            // We still merge the module scopestate with the global scopestate, but only the usages that don't escape.
            // (Later we can have also shadowed definitions for the dimming of unused variables)
            scopestate = merge_scope_state(scopestate, {
                usages: new Set(Array.from(module_scopestate.usages).filter((x) => x.definition != null)),
                definitions: new Map(),
            })
        } else if ((match = julia_ast`export ${t.multiple("exports", t.any())}`.match(cursor))) {
            let { exports } = match

            for (let { node: export_name } of exports) {
                if (julia_ast`${t.Identifier()}`.match(export_name) || julia_ast`@${t.Identifier()}`.match(export_name)) {
                    let name = doc.sliceString(export_name.from, export_name.to)
                    scopestate.usages.add({
                        usage: {
                            from: export_name.from,
                            to: export_name.to,
                        },
                        definition: scopestate.definitions.get(name) ?? null,
                    })
                }
            }
        } else if ((match = julia_ast`begin ${t.multiple("body", t.any())} end`.match(cursor))) {
            console.log(`match:`, match)
            let { body } = match
            for (let { node: expression } of body) {
                scopestate = merge_scope_state(scopestate, explore_variable_usage(expression.cursor, doc, scopestate))
            }
        } else if ((match = julia_ast`import ${t.multiple("specifiers", t.any())}`.match(cursor))) {
            let { specifiers } = match

            let import_specifier = julia_ast`import ${t.any("content")}`
            for (let { node: specifier } of specifiers) {
                let renamed_import_template = take_little_piece_of_template(jl`import ${t.any("external")}: ${t.multiple("locals", t.any())}`, import_specifier)
                let simple_identifier = take_little_piece_of_template(jl`import ${t.Identifier("name")}`, import_specifier)
                let scoped_identifier = take_little_piece_of_template(jl`import ${t.any()}.${t.Identifier("name")}`, import_specifier)

                if ((match = renamed_import_template.match(specifier))) {
                    for (let { node: local } of match.locals) {
                        scopestate_add_definition(scopestate, doc, local)
                    }
                } else if ((match = simple_identifier.match(specifier))) {
                    scopestate_add_definition(scopestate, doc, match.name)
                } else if ((match = scoped_identifier.match(specifier))) {
                    scopestate_add_definition(scopestate, doc, match.name)
                }
            }
        } else if (
            (match = julia_ast`for ${t.any("binding")} in ${t.any("value")} ${t.multiple("body", t.any())} end`.match(cursor)) ??
            (match = julia_ast`for ${t.any("binding")} = ${t.any("value")} ${t.multiple("body", t.any())} end`.match(cursor)) ??
            (match = julia_ast`for ${t.any("binding")} ∈ ${t.any("value")} ${t.multiple("body", t.any())} end`.match(cursor))
        ) {
            let { binding, value, body } = match

            // Right hand side of `for ... in ...`
            // This part is, I think, fully applied to the outer scope
            scopestate = merge_scope_state(scopestate, explore_variable_usage(value, doc, scopestate))

            // Create new scope and add the `for` binding variables to it
            let nested_scope = {
                usages: new Set(),
                definitions: new Map(scopestate.definitions),
            }
            explorer_pattern(binding, doc, nested_scope, verbose)
            // Go through the expressions in the for body
            for (let { node: expression } of body) {
                nested_scope = merge_scope_state(nested_scope, explore_variable_usage(expression, doc, nested_scope))
            }

            // Merge the usages into the main scope
            scopestate = {
                usages: new Set([...scopestate.usages, ...nested_scope.usages]),
                definitions: scopestate.definitions,
            }
        } else if (cursor.name === "DoClause" && cursor.firstChild()) {
            try {
                // It's not yet possible to be SURE that we have the arguments, because of the way @lezer/julia works...
                // But imma do my best, and soon contribute to @lezer/julia

                cursor.nextSibling() // We are now supposed to be in the argumentlist..
                // Problem is: we might also be in the first statement of the function...
                // So we'll make sure that we have something that is valid as arguments,
                // but then still someone MIGHT have a plain identifier in the first statement.

                let nested_scope = {
                    usages: new Set(),
                    definitions: new Map(scopestate.definitions),
                }
                for (let variable_node of get_variables_from_assignment(cursor)) {
                    let name = doc.sliceString(variable_node.from, variable_node.to)
                    nested_scope.definitions.set(name, {
                        from: variable_node.from,
                        to: variable_node.to,
                    })
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
        } else if (
            (match = julia_ast`function ${t.any("name")} end`.match(cursor)) ??
            (match = julia_ast`function ${t.any("name")}(${t.multiple("args", t.any())}) ${t.multiple("body", t.any())} end`.match(cursor)) ??
            (match = julia_ast`function ${t.any("name")}(${t.multiple("args", t.any())})::${t.any("return_type")}
                ${t.multiple("body", t.any())}
            end`.match(cursor))
        ) {
            // Two things
            // 1. Add the function name to the current scope
            // 2. Go through the function in a nested scope
            let { name, args = [], return_type, body = [] } = match

            scopestate_add_definition(scopestate, doc, name)

            console.log(`return_type:`, return_type)
            if (return_type) {
                scopestate = explore_variable_usage(return_type, doc, scopestate, verbose)
            }

            let nested_scope = {
                usages: new Set(),
                definitions: new Map(scopestate.definitions),
            }
            // Add argument definitions to the nested scope
            for (let { node: arg } of args) {
                nested_scope = explorer_function_argument(arg, doc, nested_scope, verbose)
            }
            for (let { node: expression } of body) {
                scopestate = explore_variable_usage(expression, doc, nested_scope, verbose)
            }
        } else if (cursor.name === "LetStatement" && cursor.firstChild()) {
            try {
                let nested_scope = {
                    usages: new Set(),
                    definitions: new Map(scopestate.definitions),
                }
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
                        usage: {
                            from: cursor.from,
                            to: cursor.to,
                        },
                        definition: scopestate.definitions.get(name),
                    })
                } else {
                    scopestate.usages.add({
                        usage: {
                            from: cursor.from,
                            to: cursor.to,
                        },
                        definition: null,
                    })
                }
            }
        } else if (cursor.name === "ForClause" || cursor.name === "IfClause") {
            // Nothing, this should be handled by ArrayComprehensionExpression
        } else if (
            (match = julia_ast`[
            ${t.any("result")}
            ${t.multiple(
                "for_bindings",
                jl`
                for ${t.any("pattern")}
            `
            )}
            in ${t.maybe(t.any("list"))}
            ${t.maybe(jl`
                if ${t.any("if")}
            `)}
        ]`.match(cursor))
        ) {
            let { result, pattern, list } = match
            console.log(`result:`, result)
        } else if (cursor.name === "ArrayComprehensionExpression" || cursor.name === "GeneratorExpression") {
            let node = cursor.node
            let for_binding = node.getChild("ForClause")?.getChild("ForBinding")
            let binding = for_binding?.firstChild
            let from = for_binding?.lastChild
            let if_clause = node.getChild("IfClause")

            // Because of the weird way this is parsed, we need `sort = true` in the Decorations.set below

            if (binding != null || from != null) {
                // Get usage for the generator
                scopestate = merge_scope_state(scopestate, explore_variable_usage(from.cursor, doc, scopestate))

                let nested_scope = {
                    usages: new Set(),
                    definitions: new Map(scopestate.definitions),
                }

                // Add definition from the binding
                for (let variable_node of get_variables_from_assignment(binding.cursor)) {
                    let name = doc.sliceString(variable_node.from, variable_node.to)
                    nested_scope.definitions.set(name, {
                        from: variable_node.from,
                        to: variable_node.to,
                    })
                }

                if (if_clause != null) {
                    do {
                        let if_clause_cursor = if_clause.cursor
                        if_clause_cursor.lastChild()
                        nested_scope = merge_scope_state(nested_scope, explore_variable_usage(if_clause_cursor, doc, nested_scope))
                    } while (cursor.nextSibling())
                }

                if (cursor.firstChild()) {
                    try {
                        do {
                            nested_scope = merge_scope_state(nested_scope, explore_variable_usage(cursor, doc, nested_scope))
                        } while (cursor.nextSibling())
                    } finally {
                        cursor.parent()
                    }
                }

                scopestate = {
                    usages: new Set([...scopestate.usages, ...nested_scope.usages]),
                    definitions: scopestate.definitions,
                }
            }

            // cursor.nextSibling()
            // // @ts-ignore
            // if (cursor.name === "ForClause" && cursor.firstChild()) {
            //     do {
            //         if (cursor.name === "ForBinding" && cursor.firstChild()) {
            //             local_variables.push(...get_variables_from_assignment(cursor))
            //             cursor.parent()
            //         }
            //     } while (cursor.nextSibling())
            //     cursor.parent()
            // }
        } else {
            // In most cases we "just" go through all the children separately
            console.log(`Not recognized:`, cursor.toString())
            if (cursor.firstChild()) {
                try {
                    do {
                        scopestate = merge_scope_state(scopestate, explore_variable_usage(cursor, doc, scopestate))
                    } while (cursor.nextSibling())
                } finally {
                    cursor.parent()
                }
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

let get_variable_marks = (state, { scopestate, used_variables }) => {
    return Decoration.set(
        Array.from(scopestate.usages)
            .map(({ definition, usage }) => {
                let text = state.doc.sliceString(usage.from, usage.to)

                if (definition == null) {
                    // TODO variables_with_origin_cell should be notebook wide, not just in the current cell
                    // .... Because now it will only show variables after it has run once
                    if (used_variables[text]) {
                        return Decoration.mark({
                            tagName: "a",
                            attributes: {
                                "title": `${ctrl_or_cmd_name}-Click to jump to the definition of ${text}.`,
                                "data-pluto-variable": text,
                                "href": `#${text}`,
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
                        tagName: "a",
                        attributes: {
                            "title": `${ctrl_or_cmd_name}-Click to jump to the definition of ${text}.`,
                            "data-cell-variable": text,
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
        let cursor = syntaxTree(state).cursor()
        try {
            let scopestate = explore_variable_usage(cursor, state.doc)
            return scopestate
        } catch (error) {
            console.error("error:", error)
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
            console.error("error:", error)
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
                                        li2ne: 0, // 1-based to 0-based index
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
