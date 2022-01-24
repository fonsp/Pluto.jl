import { syntaxTree, Facet, ViewPlugin, Decoration, StateField, EditorView, EditorSelection, EditorState } from "../../imports/CodemirrorPlutoSetup.js"
import { ctrl_or_cmd_name, has_ctrl_or_cmd_pressed } from "../../common/KeyboardShortcuts.js"
import _ from "../../imports/lodash.js"
import { as_node, as_string, child_cursors, child_nodes, create_specific_template_maker, jl, jl_dynamic, narrow, t, template } from "./lezer_template.js"

/**
 * @typedef TreeCursor
 * @type {import("../../imports/CodemirrorPlutoSetup.js").TreeCursor}
 */

/**
 * @typedef SyntaxNode
 * @type {TreeCursor["node"]}
 */

/**
 * @typedef Range
 * @property {number} from
 * @property {number} to
 *
 * @typedef ScopeState
 * @property {Array<{
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

    let usages = [...a.usages, ...b.usages]
    let definitions = new Map(a.definitions)
    for (let [key, value] of b.definitions) {
        definitions.set(key, value)
    }
    return { usages, definitions }
}

/** @param {TreeCursor} cursor */
let search_for_interpolations = function* (cursor) {
    for (let child of child_cursors(cursor)) {
        if (child.name === "InterpolationExpression") {
            yield cursor
        } else if (child.name === "QuoteExpression" || child.name === "QuoteStatement") {
            for (let child_child of search_for_interpolations(child)) {
                yield* search_for_interpolations(child_child)
            }
        } else {
            yield* search_for_interpolations(child)
        }
    }
}
/** @param {TreeCursor} cursor */
let go_through_quoted_expression_looking_for_interpolations = function* (cursor) {
    if (cursor.name !== "QuoteExpression" && cursor.name !== "QuoteStatement") throw new Error("Expected QuotedExpression or QuoteStatement")
    yield* search_for_interpolations(cursor)
}

let for_binding_template = create_specific_template_maker((x) => jl_dynamic`[i for i in i ${x}]`)
let assignment_template = create_specific_template_maker((x) => jl_dynamic`${x} = nothing`)
let function_definition_argument_template = create_specific_template_maker((x) => jl_dynamic`function f(${x}) end`)
let function_call_argument_template = create_specific_template_maker((x) => jl_dynamic`f(${x})`)

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
    } else if ((match = function_definition_argument_template(jl`${t.as("subject")}...`).match(cursor))) {
        // `function f(x...)` => ["x"]
        return explore_pattern(match.subject, doc, scopestate, verbose)
    } else if ((match = function_definition_argument_template(jl`${t.as("name")} = ${t.as("value")}`).match(cursor))) {
        // `function f(x = 10)` => ["x"]
        let { name, value } = match
        scopestate = explore_pattern(name, doc, scopestate, verbose)
        scopestate = explore_variable_usage(value.cursor, doc, scopestate, verbose)
        return scopestate
    } else if (
        (match = function_definition_argument_template(jl`${t.as("name")}::${t.as("type")}`).match(cursor)) ??
        (match = function_definition_argument_template(jl`${t.as("name")}:`).match(cursor)) ??
        (match = function_definition_argument_template(jl`${t.as("name")}::`).match(cursor)) ??
        (match = function_definition_argument_template(jl`::${t.as("type")}`).match(cursor))
    ) {
        let { name, type } = match
        if (name) scopestate = explore_pattern(name, doc, scopestate, verbose)
        if (type) scopestate = explore_variable_usage(type.cursor, doc, scopestate, verbose)
        return scopestate
    } else {
        verbose && console.warn("UNKNOWN FUNCTION ARGUMENT:", cursor.toString())
        return scopestate
    }
}

/**
 * @param {TreeCursor | SyntaxNode} node
 * @param {any} doc
 * @param {ScopeState} scopestate
 * @param {boolean?} verbose
 * @returns {ScopeState}
 */
let explore_pattern = (node, doc, scopestate, verbose = false) => {
    let match = null

    if ((match = assignment_template(t.Identifier).match(node))) {
        return scopestate_add_definition(scopestate, doc, node)
    } else if ((match = assignment_template(jl`${t.as("object")}::${t.as("type")}`).match(node))) {
        let { object, type } = match
        scopestate = explore_variable_usage(type.cursor, doc, scopestate, verbose)
        scopestate = scopestate_add_definition(scopestate, doc, object)
        return scopestate
    } else if ((match = assignment_template(jl`${t.as("subject")}...`).match(node))) {
        // `x... = [1,2,3]` => ["x"]
        return explore_pattern(match.subject, doc, scopestate, verbose)
    } else if ((match = function_definition_argument_template(jl`${t.as("name")} = ${t.as("value")}`).match(node))) {
        let { name, value } = match
        scopestate = explore_pattern(name, doc, scopestate, verbose)
        scopestate = explore_variable_usage(value.cursor, doc, scopestate, verbose)
        return scopestate
    } else if (
        (match = assignment_template(jl`${t.as("first")}, ${t.many("rest")}`).match(node)) ??
        (match = assignment_template(jl`(${t.as("first")}, ${t.many("rest")})`).match(node))
    ) {
        // console.warn("Tuple assignment... but the bad one")
        for (let { node: name } of [{ node: match.first }, ...(match.rest ?? [])]) {
            scopestate = explore_pattern(name.cursor, doc, scopestate, verbose)
        }
        return scopestate
    } else {
        verbose && console.warn("UNKNOWN PATTERN:", node.toString())
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
        return {
            inner: scopestate_add_definition(scopestate, doc, cursor),
            outer: scopestate_add_definition(fresh_scope(), doc, cursor),
        }
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
    } else if ((match = template(jl`${t.as("subject")} <: ${t.maybe(t.as("type"))}`).match(cursor))) {
        let { subject, type } = match
        let outer = fresh_scope()
        if (subject) ({ outer, inner: scopestate } = explore_definition(subject.cursor, doc, scopestate))
        if (type) scopestate = explore_variable_usage(type.cursor, doc, scopestate)
        return { inner: scopestate, outer: outer }
    } else {
        verbose && console.warn(`Unknown thing in definition: "${doc.sliceString(cursor.from, cursor.to)}", "${cursor.toString()}"`)
        // return scopestate
    }
}

/**
 * @param {TreeCursor} cursor
 * @param {any} doc
 * @param {ScopeState} scopestate
 * @param {boolean} [verbose]
 * @returns {ScopeState}
 */
let explore_macro_identifier = (cursor, doc, scopestate, verbose = false) => {
    let match = null

    let macro_identifier_template = create_specific_template_maker((x) => jl_dynamic`${x} x y z`)

    if ((match = macro_identifier_template(jl`${t.as("macro", jl`@${t.any}`)}`).match(cursor))) {
        let { macro } = match
        let name = doc.sliceString(macro.from, macro.to)
        scopestate.usages.push({
            usage: macro,
            definition: scopestate.definitions.get(name),
            name: name,
        })
        return scopestate
    } else if ((match = macro_identifier_template(jl`${t.as("object")}.@${t.as("macro")}`).match(cursor))) {
        let { object } = match
        let name = doc.sliceString(object.from, object.to)
        scopestate.usages.push({
            usage: object,
            definition: scopestate.definitions.get(name),
            name: name,
        })
        return scopestate
    } else if ((match = macro_identifier_template(jl`@${t.as("object")}.${t.as("macro")}`).match(cursor))) {
        let { object } = match
        let name = doc.sliceString(object.from, object.to)
        scopestate.usages.push({
            usage: object,
            definition: scopestate.definitions.get(name),
            name: name,
        })
        return scopestate
    } else {
        verbose && console.warn("Mwep mweeeep", cursor.toString())
    }
}

/**
 * @returns {ScopeState}
 */
let fresh_scope = () => {
    return {
        usages: [],
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
        usages: [],
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
        usages: [...scopestate.usages, ...nested_scope.usages],
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
        usages: [],
        definitions: new Map(),
    },
    verbose = false
) => {
    if ("cursor" in cursor) {
        // console.trace("`explore_variable_usage()` called with a SyntaxNode, not a TreeCursor")
        cursor = cursor["cursor"]
    }

    let start_node = null
    if (verbose) {
        verbose && console.group(`Explorer: ${cursor.toString()}`)
        verbose && console.log("Full text:", doc.sliceString(cursor.from, cursor.to))
        start_node = cursor.node
    }
    try {
        let match = null

        // Doing these checks in front seems to speed things up a bit.
        if (
            cursor.name === "SourceFile" ||
            cursor.name === "BooleanLiteral" ||
            cursor.name === "Character" ||
            cursor.name === "String" ||
            cursor.name === "Number" ||
            cursor.name === "Comment" ||
            cursor.name === "BinaryExpression" ||
            cursor.name === "Operator" ||
            cursor.name === "MacroArgumentList" ||
            cursor.name === "ReturnStatement" ||
            cursor.name === "BareTupleExpression" ||
            cursor.name === "ParenthesizedExpression" ||
            cursor.name === "Type" ||
            cursor.name === "InterpolationExpression" ||
            cursor.name === "SpreadExpression" ||
            cursor.name === "CompoundExpression" ||
            cursor.name === "ParameterizedIdentifier" ||
            cursor.name === "TypeArgumentList" ||
            cursor.name === "TernaryExpression" ||
            cursor.name === "Coefficient" ||
            cursor.name === "TripleString" ||
            cursor.name === "RangeExpression" ||
            cursor.name === "SubscriptExpression" ||
            cursor.name === "UnaryExpression" ||
            cursor.name === "ConstStatement" ||
            cursor.name === "GlobalStatement" ||
            cursor.name === "ContinueStatement" ||
            cursor.name === "MatrixExpression" ||
            cursor.name === "MatrixRow" ||
            cursor.name === "ArrayExpression"
        ) {
            for (let subcursor of child_cursors(cursor)) {
                scopestate = explore_variable_usage(subcursor, doc, scopestate)
            }
            return scopestate
        }

        if (cursor.name === "Identifier" || cursor.name === "MacroIdentifier") {
            let name = doc.sliceString(cursor.from, cursor.to)
            scopestate.usages.push({
                name: name,
                usage: {
                    from: cursor.from,
                    to: cursor.to,
                },
                definition: scopestate.definitions.get(name),
            })
            return scopestate
        } else if ((match = template(jl`:${t.any}`).match(cursor))) {
            // Nothing, ha!
            return scopestate
        } else if ((match = template(t.Number).match(cursor))) {
            // Nothing, ha!
            return scopestate
        } else if ((match = template(t.String).match(cursor))) {
            // Nothing, ha!
            return scopestate
        } else if ((match = template(jl`${t.as("object")}.${t.as("property")}`).match(cursor))) {
            let { object, property } = match
            if (object) scopestate = explore_variable_usage(object.cursor, doc, scopestate)
            return scopestate
        } else if (
            (match = template(jl`
                ${t.as("macro", t.anything_that_fits(jl`@macro`))}(${t.many("args")}) ${t.maybe(jl`do ${t.as("do_args")}
                    ${t.many("do_expressions")}
                end`)}}
            `).match(cursor))
        ) {
            let { macro, args = [], do_args, do_expressions } = match
            if (macro) explore_macro_identifier(macro.cursor, doc, scopestate, verbose)

            for (let { node: arg } of args) {
                if ((match = function_call_argument_template(jl`${t.as("name")} = ${t.as("value")}`).match(arg))) {
                    let { name, value } = match
                    if (value) scopestate = explore_variable_usage(value.cursor, doc, scopestate)
                } else {
                    scopestate = explore_variable_usage(arg.cursor, doc, scopestate)
                }
            }

            if (do_args && do_expressions) {
                // Cheating because lezer-julia isn't up to this task yet
                // TODO Fix julia-lezer to work better with `do` blocks
                let inner_scope = lower_scope(scopestate)

                // Don't ask me why, but currently `do (x, y)` is parsed as `DoClauseArguments(ArgumentList(x, y))`
                // while an actual argumentslist, `do x, y` is parsed as `DoClauseArguments(BareTupleExpression(x, y))`
                let do_args_actually = do_args.firstChild
                if (do_args_actually.name === "Identifier") {
                    inner_scope = scopestate_add_definition(inner_scope, doc, do_args_actually)
                } else if (do_args_actually.name === "ArgumentList") {
                    for (let child of child_nodes(do_args_actually)) {
                        inner_scope = explorer_function_argument(child, doc, inner_scope)
                    }
                } else if (do_args_actually.name === "BareTupleExpression") {
                    for (let child of child_nodes(do_args_actually)) {
                        inner_scope = explorer_function_argument(child, doc, inner_scope)
                    }
                } else {
                    verbose && console.warn("Unrecognized do args", do_args_actually.toString())
                }

                for (let { node: expression } of do_expressions) {
                    inner_scope = explore_variable_usage(expression.cursor, doc, inner_scope)
                }
                return raise_scope(inner_scope, scopestate)
            }

            return scopestate
        } else if ((match = template(jl`${t.as("macro", t.anything_that_fits(jl`@macro`))} ${t.many("args")}`).match(cursor))) {
            let { macro, args = [] } = match
            if (macro) explore_macro_identifier(macro.cursor, doc, scopestate, verbose)

            for (let { node: arg } of args) {
                scopestate = explore_variable_usage(arg.cursor, doc, scopestate)
            }
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
                    inner_scope = explore_variable_usage(type.cursor, doc, inner_scope)
                } else if ((match = template(jl`${t.as("assignee")} = ${t.as("value")}`).match(expression))) {
                    let { assignee, value } = match

                    // Yeah... we do the same `a::G` check again
                    if ((match = template(jl`${t.as("subject")}::${t.as("type")}`).match(assignee))) {
                        let { subject, type } = match
                        inner_scope = explore_variable_usage(type.cursor, doc, inner_scope)
                    }
                    inner_scope = explore_variable_usage(value.cursor, doc, inner_scope)
                }
            }

            scopestate = raise_scope(inner_scope, scopestate)
            scopestate = merge_scope_state(scopestate, outer_scope)
            return scopestate
        } else if ((match = template(jl`abstract type ${t.as("name")} end`).match(cursor))) {
            let { name } = match
            if (name) ({ outer: scopestate } = explore_definition(name.cursor, doc, scopestate))
            return scopestate
        } else if (
            (match = template(jl`quote ${t.many("body", t.any)} end`).match(cursor)) ??
            (match = template(jl`:(${t.many("body", t.any)})`).match(cursor))
        ) {
            // We don't use the match because I made `go_through_quoted_expression_looking_for_interpolations`
            // to take a cursor at the quoted expression itself
            for (let interpolation_cursor of go_through_quoted_expression_looking_for_interpolations(cursor)) {
                scopestate = explore_variable_usage(interpolation_cursor, doc, scopestate)
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
                module_scope = explore_variable_usage(expression.cursor, doc, module_scope)
            }
            // We still merge the module scopestate with the global scopestate, but only the usages that don't escape.
            // (Later we can have also shadowed definitions for the dimming of unused variables)
            scopestate = merge_scope_state(scopestate, {
                usages: Array.from(module_scope.usages).filter((x) => x.definition != null),
                definitions: new Map(),
            })

            for (let { node: expression } of match.expressions) {
                scopestate = explore_variable_usage(expression.cursor, doc, scopestate)
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
                    scopestate.usages.push({
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
                scopestate.usages.push({
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
            // This isn't that useful, just wanted to test (and show off) the template
            return explore_variable_usage(match.unit.cursor, doc, scopestate)
        } else if (
            (match = template(jl`import ${t.many("specifiers", t.any)}`).match(cursor)) ??
            // Only match `using X: ...`, because these have exported names I can see.
            // Normal `using X` is handled below.
            (match = template(jl`using ${t.any}: ${t.many("specifiers", t.any)}`).match(cursor))
        ) {
            let { specifiers } = match

            let import_specifier_template = create_specific_template_maker((x) => jl_dynamic`import ${x}`)
            // Apparently there is a difference between the `X as Y` in `import X as Y` and `import P: X as Y`
            // This template is specifically for `X as Y` in `import P: X as Y`.
            let very_specific_import_specifier_template = create_specific_template_maker((x) => jl_dynamic`import X: ${x}`)

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
                } else if ((match = very_specific_import_specifier_template(jl`@${t.any}`).match(specifier))) {
                    return scopestate_add_definition(scopestate, doc, specifier)
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
                        verbose && console.warn("Something odd going on with ScopedIdentifiers", original_identifier.toString())
                        return scopestate
                    }
                } else {
                    verbose && console.warn("Unrecognized import specifier", specifier.toString())
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
            let for_loop_binding_template = create_specific_template_maker((arg) => jl_dynamic`for ${arg}; x end`)

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
                    if (name) inner_scope = explore_pattern(name, doc, inner_scope)
                } else {
                    verbose && console.warn("Unrecognized for loop binding", binding.toString())
                }
            }

            for (let { node: expression } of expressions) {
                inner_scope = explore_variable_usage(expression.cursor, doc, inner_scope)
            }

            return raise_scope(inner_scope, scopestate)
        } else if (
            (match = template(jl`
                ${t.as("callee")}(
                    ${t.many("args")}
                ) ${t.maybe(jl`do ${t.as("do_args")}
                    ${t.many("do_expressions")}
                end`)}
            `).match(cursor))
        ) {
            let { callee, args = [], do_args, do_expressions } = match

            scopestate = explore_variable_usage(callee.cursor, doc, scopestate)

            for (let { node: arg } of args) {
                let match = null
                if ((match = function_call_argument_template(jl`${t.as("name")} = ${t.as("value")}`).match(arg))) {
                    let { name, value } = match
                    if (value) scopestate = explore_variable_usage(value.cursor, doc, scopestate)
                } else if (
                    (match = function_call_argument_template(jl`${t.as("result")} ${t.many("clauses", t.anything_that_fits(jl`for x = y`))}`).match(arg))
                ) {
                    let { result, clauses } = match
                    let nested_scope = lower_scope(scopestate)
                    // Because of the `t.anything_that_fits`, we can now match different `for x ? y`'s and `if x`s manually.
                    // There might be a way to express this in the template, but this keeps templates a lot simpler yet powerful.
                    for (let { node: for_binding } of clauses) {
                        let match = null
                        if (
                            (match = for_binding_template(jl`for ${t.as("variable")} = ${t.maybe(t.as("value"))}`).match(for_binding)) ??
                            (match = for_binding_template(jl`for ${t.as("variable")} in ${t.maybe(t.as("value"))}`).match(for_binding)) ??
                            (match = for_binding_template(jl`for ${t.as("variable")} ∈ ${t.maybe(t.as("value"))}`).match(for_binding)) ??
                            (match = for_binding_template(jl`for ${t.as("variable")}`).match(for_binding))
                        ) {
                            let { variable, value } = match

                            if (value) nested_scope = explore_variable_usage(value.cursor, doc, nested_scope)
                            if (variable) nested_scope = explore_pattern(variable, doc, nested_scope)
                        } else if ((match = for_binding_template(jl`if ${t.maybe(t.as("if"))}`).match(for_binding))) {
                            let { if: node } = match
                            if (node) nested_scope = explore_variable_usage(node.cursor, doc, nested_scope)
                        } else {
                            verbose && console.log("Hmmm, can't parse for binding", for_binding)
                        }
                    }

                    nested_scope = explore_variable_usage(result.cursor, doc, nested_scope)

                    return raise_scope(nested_scope, scopestate)
                } else {
                    scopestate = explore_variable_usage(arg.cursor, doc, scopestate)
                }
            }

            if (do_args && do_expressions) {
                // Cheating because lezer-julia isn't up to this task yet
                // TODO Fix julia-lezer to work better with `do` blocks
                let inner_scope = lower_scope(scopestate)

                // Don't ask me why, but currently `do (x, y)` is parsed as `DoClauseArguments(ArgumentList(x, y))`
                // while an actual argumentslist, `do x, y` is parsed as `DoClauseArguments(BareTupleExpression(x, y))`
                let do_args_actually = do_args.firstChild
                if (do_args_actually.name === "Identifier") {
                    inner_scope = scopestate_add_definition(inner_scope, doc, do_args_actually)
                } else if (do_args_actually.name === "ArgumentList") {
                    for (let child of child_nodes(do_args_actually)) {
                        inner_scope = explorer_function_argument(child, doc, inner_scope)
                    }
                } else if (do_args_actually.name === "BareTupleExpression") {
                    for (let child of child_nodes(do_args_actually)) {
                        inner_scope = explorer_function_argument(child, doc, inner_scope)
                    }
                } else {
                    verbose && console.warn("Unrecognized do args", do_args_actually.toString())
                }

                for (let { node: expression } of do_expressions) {
                    inner_scope = explore_variable_usage(expression.cursor, doc, inner_scope)
                }
                return raise_scope(inner_scope, scopestate)
            }
            return scopestate
        } else if ((match = template(jl`(${t.many("tuple_elements")},)`).match(cursor))) {
            // TODO.. maybe? `(x, g = y)` is a "ParenthesizedExpression", but lezer parses it as a tuple...
            // For now I fix it here hackily by checking if there is only NamedFields

            let { tuple_elements = [] } = match

            let tuple_element_template = create_specific_template_maker((arg) => jl_dynamic`(${arg},)`)

            let is_named_field = tuple_elements.map(({ node }) => tuple_element_template(jl`${t.Identifier} = ${t.any}`).match(node) != null)

            if (is_named_field.every((x) => x === true) || is_named_field.every((x) => x === false)) {
                // Valid tuple, either named or unnamed
                for (let { node: element } of tuple_elements) {
                    let match = null
                    if ((match = tuple_element_template(jl`${t.as("name")} = ${t.as("value")}`).match(element))) {
                        let { name, value } = match
                        if (value) scopestate = explore_variable_usage(value.cursor, doc, scopestate)
                    } else {
                        scopestate = explore_variable_usage(element.cursor, doc, scopestate)
                    }
                }
            } else {
                // Sneaky! Actually an expression list 😏
                for (let { node: element } of tuple_elements) {
                    let match = null
                    if ((match = tuple_element_template(jl`${t.as("name")} = ${t.as("value")}`).match(element))) {
                        // 🚨 actually an assignment 🚨
                        let { name, value } = match
                        if (name) scopestate = scopestate_add_definition(scopestate, doc, name)
                        if (value) scopestate = explore_variable_usage(value.cursor, doc, scopestate)
                    } else {
                        scopestate = explore_variable_usage(element.cursor, doc, scopestate)
                    }
                }
            }
            return scopestate
        } else if (
            (match = template(jl`(${t.many("args")}) -> ${t.many("body")}`).match(cursor)) ??
            (match = template(jl`${t.many("args")} -> ${t.many("body")}`).match(cursor)) ??
            (match = template(jl`
                ${t.as("name")}${t.maybe(jl`(${t.many("args")})`)}::${t.as("return_type")} =
                    ${t.many("body")}
            `).match(cursor)) ??
            (match = template(jl`${t.as("name")}(${t.many("args")}) = ${t.many("body")}`).match(cursor)) ??
            (match = template(jl`${t.as("name")}(${t.many("args")}) = ${t.many("body", t.anything_that_fits(jl`x, y`))}`).match(cursor)) ??
            (match = template(jl`function ${t.as("name")} end`).match(cursor)) ??
            (match = template(jl`
                function ${t.as("name")}${t.maybe(jl`(${t.many("args")})`)}${t.maybe(jl`::${t.as("return_type")}`)}
                    ${t.many("body")}
                end
            `).match(cursor)) ??
            // Putting macro definitions here too because they are very similar
            (match = template(jl`macro ${t.as("macro_name")} end`).match(cursor)) ??
            (match = template(jl`macro ${t.as("macro_name")}(${t.many("args")})
                ${t.many("body")}
            end`).match(cursor))
        ) {
            let { name, macro_name, args = [], return_type, body = [] } = match

            if (name) {
                scopestate = scopestate_add_definition(scopestate, doc, name)
            } else if (macro_name) {
                scopestate.definitions.set(`@${doc.sliceString(macro_name.from, macro_name.to)}`, {
                    from: macro_name.from,
                    to: macro_name.to,
                })
            }

            if (return_type) {
                scopestate = explore_variable_usage(narrow(return_type).cursor, doc, scopestate, verbose)
            }

            let inner_scope = lower_scope(scopestate)
            for (let { node: arg } of args) {
                inner_scope = explorer_function_argument(arg.cursor, doc, inner_scope, verbose)
            }
            for (let { node: expression } of body) {
                inner_scope = explore_variable_usage(expression.cursor, doc, inner_scope, verbose)
            }
            return raise_scope(inner_scope, scopestate)
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
                if (assignee) innerscope = explore_pattern(assignee, doc, innerscope)
                // Explorer righthandside in the outer scope
                if (value) scopestate = explore_variable_usage(value.cursor, doc, scopestate)
            }
            // Explorer body in innerscope
            for (let { node: line } of body) {
                innerscope = explore_variable_usage(line.cursor, doc, innerscope, verbose)
            }
            return raise_scope(innerscope, scopestate)
        } else if ((match = template(jl`${t.as("assignee")} = ${t.maybe(t.as("value"))}`).match(cursor))) {
            let { assignee, value } = match
            if (assignee) scopestate = explore_pattern(assignee.cursor, doc, scopestate, verbose)
            if (value) scopestate = explore_variable_usage(value.cursor, doc, scopestate, verbose)
            return scopestate
        } else if (
            // A bit hard to see from the template, but these are array (and generator) comprehensions
            // e.g. [x for x in y]
            (match = template(jl`[
                ${t.as("result")}
                ${t.many("clauses", t.anything_that_fits(jl`for x = y`))}
            ]`).match(cursor)) ??
            // Are there syntax differences between Array or Generator expressions?
            // For now I treat them the same...
            // (Also this is one line because lezer doesn't parse multiline generator expressions yet)
            (match = template(jl`(${t.as("result")} ${t.many("clauses", t.anything_that_fits(jl`for x = y`))})`).match(cursor))
        ) {
            let { result, clauses } = match

            let nested_scope = lower_scope(scopestate)

            // Because of the `t.anything_that_fits`, we can now match different `for x ? y`'s and `if x`s manually.
            // There might be a way to express this in the template, but this keeps templates a lot simpler yet powerful.
            for (let { node: for_binding } of clauses) {
                let match = null
                if (
                    (match = for_binding_template(jl`for ${t.as("variable")} = ${t.maybe(t.as("value"))}`).match(for_binding)) ??
                    (match = for_binding_template(jl`for ${t.as("variable")} in ${t.maybe(t.as("value"))}`).match(for_binding)) ??
                    (match = for_binding_template(jl`for ${t.as("variable")} ∈ ${t.maybe(t.as("value"))}`).match(for_binding)) ??
                    (match = for_binding_template(jl`for ${t.as("variable")}`).match(for_binding))
                ) {
                    let { variable, value } = match

                    if (value) nested_scope = explore_variable_usage(value.cursor, doc, nested_scope)
                    if (variable) nested_scope = explore_pattern(variable, doc, nested_scope)
                } else if ((match = for_binding_template(jl`if ${t.maybe(t.as("if"))}`).match(for_binding))) {
                    let { if: node } = match
                    if (node) nested_scope = explore_variable_usage(node.cursor, doc, nested_scope)
                } else {
                    verbose && console.log("Hmmm, can't parse for binding", for_binding)
                }
            }

            nested_scope = explore_variable_usage(result.cursor, doc, nested_scope)

            return raise_scope(nested_scope, scopestate)
        } else {
            if (cursor.name === "VariableDeclaration") {
                throw new Error("VariableDeclaration???")
            }

            if (
                verbose &&
                ![
                    "SourceFile",
                    "BooleanLiteral",
                    "Character",
                    "String",
                    "Number",
                    "Comment",
                    "BinaryExpression",
                    "Operator",
                    "MacroArgumentList",
                    "ReturnStatement",
                    "BareTupleExpression",
                    "ParenthesizedExpression",
                    "Type",
                    "InterpolationExpression",
                    "SpreadExpression",
                    "CompoundExpression",
                    "ParameterizedIdentifier",
                    "TypeArgumentList",
                    "TernaryExpression",
                    "Coefficient",
                    "TripleString",
                    "RangeExpression",
                    "SubscriptExpression",
                    "UnaryExpression",
                    "ConstStatement",
                    "GlobalStatement",
                    "ContinueStatement",
                    "MatrixExpression",
                    "MatrixRow",
                    "ArrayExpression",
                ].includes(cursor.name) &&
                cursor.name.toLowerCase() !== cursor.name
            ) {
                console.log(`cursor.name:`, cursor.name)
                console.log(`doc.sliceString(cursor.from, cursor.to):`, doc.sliceString(cursor.from, cursor.to))
            }

            // In most cases we "just" go through all the children separately
            verbose && console.log("Cycling through children of", cursor.name)
            for (let subcursor of child_cursors(cursor)) {
                scopestate = explore_variable_usage(subcursor, doc, scopestate)
            }
            return scopestate
        }
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
        scopestate.usages
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
                usages: [],
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
                usages: [],
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
