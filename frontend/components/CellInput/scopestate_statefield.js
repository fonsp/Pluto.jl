import { syntaxTree, StateField } from "../../imports/CodemirrorPlutoSetup.js"
import _ from "../../imports/lodash.js"
import { child_cursors, child_nodes, create_specific_template_maker, jl, jl_dynamic, narrow, t, template } from "./lezer_template.js"

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
 * @typedef {Range & {valid_from: number}} Definition
 *
 * @typedef ScopeState
 * @property {Array<{
 *  usage: Range,
 *  definition: Range | null,
 *  name: string,
 * }>} usages
 * @property {Map<String, Definition>} definitions
 * @property {Array<{ definition: Range, validity: Range, name: string }>} locals
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
    let locals = [...a.locals, ...b.locals]
    return { usages, definitions, locals }
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

/**
 * So this was a late addition, and it creates a bit crazy syntax...
 * but I love it for that syntax! It really makes the patterns pop out,
 * which it really needs, because the patterns are the most important part of this code..
 * @param {(subsitution: import("./lezer_template.js").Templatable) => import("./lezer_template.js").Matcher} template_fn
 */
let make_beautiful_matcher = (template_fn) => {
    return function match(cursor, verbose = false) {
        if (cursor == null) {
            /** @type {(...args: Parameters<jl>) => any} */
            return (x, ...args) => {
                return template_fn(jl(x, ...args))
            }
        }

        /** @type {(...args: Parameters<jl>) => any} */
        return function jl_and_match(x, ...args) {
            return template_fn(jl(x, ...args)).match(cursor, verbose)
        }
    }
}

/**
 * @param {Parameters<create_specific_template_maker>[0]} template_creator
 */
let make_beautiful_specific_matcher = (template_creator) => {
    let template_fn = create_specific_template_maker(template_creator)
    return function match(cursor, verbose = false) {
        if (cursor == null) {
            /** @type {(...args: Parameters<jl>) => any} */
            return (x, ...args) => {
                return template_fn(jl(x, ...args))
            }
        }

        /** @type {(...args: Parameters<jl>) => any} */
        return function jl_and_match(x, ...args) {
            return template_fn(jl(x, ...args)).match(cursor, verbose)
        }
    }
}

let match_for_binding = make_beautiful_specific_matcher((x) => jl_dynamic`[i for i in i ${x}]`)
let match_assignee = make_beautiful_specific_matcher((x) => jl_dynamic`${x} = nothing`)
let match_function_definition_argument = make_beautiful_specific_matcher((x) => jl_dynamic`function f(${x}) end`)
let match_function_call_argument = make_beautiful_specific_matcher((x) => jl_dynamic`f(${x})`)
let match_function_call_named_argument = make_beautiful_specific_matcher((x) => jl_dynamic`f(; ${x})`)

/**
 * @param {TreeCursor | SyntaxNode} cursor
 * @param {any} doc
 * @param {ScopeState} scopestate
 * @param {boolean?} verbose
 * @returns {ScopeState}
 */
let explorer_function_definition_argument = (cursor, doc, scopestate, verbose = false) => {
    let match = null

    if ((match = match_function_call_argument(cursor)`; ${t.many("named_args")}`)) {
        // "Parameters", the `y, z` in `function f(x; y, z) end`
        let { named_args = [] } = match
        for (let { node: named_arg } of named_args) {
            scopestate = explorer_function_definition_argument(named_arg, doc, scopestate, verbose)
        }
        return scopestate
    } else if ((match = match_function_definition_argument(cursor)`${t.Identifier}`)) {
        return scopestate_add_definition(scopestate, doc, cursor)
    } else if ((match = match_function_definition_argument(cursor)`${t.as("subject")}...`)) {
        // `function f(x...)` => ["x"]
        return explore_pattern(match.subject, doc, scopestate, null, verbose)
    } else if ((match = match_function_definition_argument(cursor)`${t.as("name")} = ${t.as("value")}`)) {
        // `function f(x = 10)` => ["x"]
        let { name, value } = match
        scopestate = explore_pattern(name, doc, scopestate, value.to, verbose)
        scopestate = explore_variable_usage(value.cursor, doc, scopestate, verbose)
        return scopestate
    } else if (
        (match = match_function_definition_argument(cursor)`${t.as("name")}::${t.as("type")}`) ??
        (match = match_function_definition_argument(cursor)`${t.as("name")}:`) ??
        // (match = match_function_definition_argument(cursor)`${t.as("name")}::`) ??
        (match = match_function_definition_argument(cursor)`::${t.as("type")}`)
    ) {
        let { name, type } = match
        if (name) scopestate = explore_pattern(name, doc, scopestate, type.to, verbose)
        if (type) scopestate = explore_variable_usage(type.cursor, doc, scopestate, verbose)
        return scopestate
    } else {
        verbose && console.warn("UNKNOWN FUNCTION DEFINITION ARGUMENT:", cursor.toString())
        return scopestate
    }
}

/**
 * @param {TreeCursor | SyntaxNode} node
 * @param {any} doc
 * @param {ScopeState} scopestate
 * @param {number?} valid_from
 * @param {boolean?} verbose
 * @returns {ScopeState}
 */
let explore_pattern = (node, doc, scopestate, valid_from = null, verbose = false) => {
    let match = null

    if ((match = match_assignee(node)`${t.Identifier}`)) {
        return scopestate_add_definition(scopestate, doc, node, valid_from)
    } else if ((match = match_assignee(node)`${t.as("object")}::${t.as("type")}`)) {
        let { object, type } = match
        scopestate = explore_variable_usage(type.cursor, doc, scopestate, verbose)
        scopestate = scopestate_add_definition(scopestate, doc, object)
        return scopestate
    } else if ((match = match_assignee(node)`${t.as("subject")}...`)) {
        // `x... = [1,2,3]` => ["x"]
        return explore_pattern(match.subject, doc, scopestate, valid_from, verbose)
    } else if ((match = match_function_definition_argument(node)`${t.as("name")} = ${t.as("value")}`)) {
        let { name, value } = match
        scopestate = explore_pattern(name, doc, scopestate, value.from, verbose)
        scopestate = explore_variable_usage(value.cursor, doc, scopestate, verbose)
        return scopestate
    } else if ((match = match_assignee(node)`${t.as("first")}, ${t.many("rest")}`) ?? (match = match_assignee(node)`(${t.as("first")}, ${t.many("rest")})`)) {
        // console.warn("Tuple assignment... but the bad one")
        for (let { node: name } of [{ node: match.first }, ...(match.rest ?? [])]) {
            scopestate = explore_pattern(name.cursor, doc, scopestate, valid_from, verbose)
        }
        return scopestate
    } else if ((match = match_julia(node)`${t.as("prefix")}${t.as("string", t.String)}`)) {
        // This one is also a bit enigmatic, but `t.String` renders in the template as `"..."`,
        // so the template with match things that look like `prefix"..."`
        let { prefix, string } = match
        let prefix_string = doc.sliceString(prefix.from, prefix.to)

        if (prefix_string === "var") {
            let name = doc.sliceString(string.from + 1, string.to - 1)
            if (name.length !== 0) {
                scopestate.definitions.set(name, {
                    from: node.from,
                    to: node.to,
                    valid_from: node.to,
                })
            }
        } else {
            scopestate = explore_variable_usage("cursor" in node ? node.cursor : node, doc, scopestate, verbose)
        }
        return scopestate
    } else if ((match = match_assignee(node)`${t.as("object")}[${t.as("property")}]`)) {
        let { object, property } = match
        scopestate = explore_variable_usage(object.cursor, doc, scopestate, verbose)
        if (property) scopestate = explore_variable_usage(property.cursor, doc, scopestate, verbose)
        return scopestate
    } else if ((match = match_assignee(node)`${t.as("object")}.${t.as("property")}`)) {
        let { object, property } = match
        scopestate = explore_variable_usage(object.cursor, doc, scopestate, verbose)
        return scopestate
    } else {
        verbose && console.warn("UNKNOWN PATTERN:", node.toString(), doc.sliceString(node.from, node.to))
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
    } else if ((match = match_julia(cursor)`${t.as("subject")}{ ${t.many("parameters")} }`)) {
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
    } else if ((match = match_julia(cursor)`${t.as("subject")} <: ${t.maybe(t.as("type"))}`)) {
        let { subject, type } = match
        let outer = fresh_scope()
        if (subject) ({ outer, inner: scopestate } = explore_definition(subject.cursor, doc, scopestate))
        if (type) scopestate = explore_variable_usage(type.cursor, doc, scopestate)
        return { inner: scopestate, outer: outer }
    } else {
        verbose && console.warn(`Unknown thing in definition: "${doc.sliceString(cursor.from, cursor.to)}", "${cursor.toString()}"`)
        return { inner: scopestate, outer: fresh_scope() }
    }
}

let match_julia = make_beautiful_matcher(template)

/**
 * @param {TreeCursor} cursor
 * @param {any} doc
 * @param {ScopeState} scopestate
 * @param {boolean} [verbose]
 * @returns {ScopeState}
 */
let explore_macro_identifier = (cursor, doc, scopestate, verbose = false) => {
    let match = null

    let match_macro_identifier = make_beautiful_specific_matcher((x) => jl_dynamic`${x} x y z`)

    if ((match = match_macro_identifier(cursor)`${t.as("macro", jl`@${t.any}`)}`)) {
        let { macro } = match
        let name = doc.sliceString(macro.from, macro.to)
        scopestate.usages.push({
            usage: macro,
            definition: scopestate.definitions.get(name),
            name: name,
        })
        return scopestate
    } else if ((match = match_macro_identifier(cursor)`${t.as("object")}.@${t.as("macro")}`)) {
        let { object } = match
        let name = doc.sliceString(object.from, object.to)
        scopestate.usages.push({
            usage: object,
            definition: scopestate.definitions.get(name),
            name: name,
        })
        return scopestate
    } else if ((match = match_macro_identifier(cursor)`@${t.as("object")}.${t.as("macro")}`)) {
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
        locals: [],
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
        locals: [],
    }
}

/**
 * For use in combination with `lower_scope`.
 * This will take an inner scope and merge only the usages into the outer scope.
 * So we see the usages of the inner scope, but the definitions don't exist in the outer scope.
 *
 * @param {ScopeState} nested_scope
 * @param {ScopeState} scopestate
 * @param {number} nested_scope_validity
 * @returns {ScopeState}
 */
let raise_scope = (nested_scope, scopestate, nested_scope_validity = null) => {
    return {
        usages: [...scopestate.usages, ...nested_scope.usages],
        definitions: scopestate.definitions,
        locals: [
            // TODO: Disabled because of performance problems, see https://github.com/fonsp/Pluto.jl/pull/1925
            // ...(nested_scope_validity === null
            //     ? []
            //     : Array.from(nested_scope.definitions)
            //           .filter(([name, _]) => !scopestate.definitions.has(name))
            //           .map(([name, definition]) => ({
            //               name,
            //               definition,
            //               validity: {
            //                   from: definition.valid_from,
            //                   to: nested_scope_validity,
            //               },
            //           }))),
            // ...nested_scope.locals,
            // ...scopestate.locals,
        ],
    }
}

/**
 * @param {ScopeState} scopestate
 * @param {any} doc
 * @param {SyntaxNode | TreeCursor} node
 * @param {number?} valid_from
 */
let scopestate_add_definition = (scopestate, doc, node, valid_from = null) => {
    valid_from = valid_from === null ? node.to : valid_from
    scopestate.definitions.set(doc.sliceString(node.from, node.to), {
        from: node.from,
        to: node.to,
        valid_from,
    })
    return scopestate
}

/**
 * @param {TreeCursor} cursor
 * @param {any} doc
 * @param {ScopeState} scopestate
 * @returns {ScopeState}
 */
export let explore_variable_usage = (
    cursor,
    doc,
    scopestate = {
        usages: [],
        definitions: new Map(),
        locals: [],
    },
    verbose = false
) => {
    if ("cursor" in cursor) {
        // console.trace("`explore_variable_usage()` called with a SyntaxNode, not a TreeCursor")
        cursor = cursor["cursor"]
    }

    let start_node = null
    if (verbose) {
        console.group(`Explorer: ${cursor.name}`)

        console.groupCollapsed("Details")
        try {
            console.log(`Full tree: ${cursor.toString()}`)
            console.log("Full text:", doc.sliceString(cursor.from, cursor.to))
            console.log(`scopestate:`, scopestate)
        } finally {
            console.groupEnd()
        }
        start_node = cursor.node
    }
    try {
        let match = null

        // Doing these checks in front seems to speed things up a bit.
        if (
            cursor.type.is("keyword") ||
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
                scopestate = explore_variable_usage(subcursor, doc, scopestate, verbose)
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
        } else if ((match = match_julia(cursor)`:${t.any}`)) {
            // Nothing, ha!
            return scopestate
        } else if ((match = match_julia(cursor)`${t.Number}`)) {
            // Nothing, ha!
            return scopestate
        } else if ((match = match_julia(cursor)`${t.String}`)) {
            // Nothing, ha!
            return scopestate
        } else if ((match = match_julia(cursor)`${t.as("object")}.${t.as("property")}`)) {
            let { object, property } = match
            if (object) scopestate = explore_variable_usage(object.cursor, doc, scopestate, verbose)
            return scopestate
        } else if ((match = match_julia(cursor)`${t.as("assignee")} = ${t.maybe(t.as("value"))}`)) {
            let { assignee, value } = match
            if (value) scopestate = explore_variable_usage(value.cursor, doc, scopestate, verbose)
            if (assignee) scopestate = explore_pattern(assignee.cursor, doc, scopestate, value?.to ?? null, verbose)
            return scopestate
        } else if (
            (match = match_julia(cursor)`
                ${t.as("macro", t.anything_that_fits(jl`@macro`))}(${t.many("args")}) ${t.maybe(jl`do ${t.maybe(t.many("do_args"))}
                    ${t.many("do_expressions")}
                end`)}}
            `)
        ) {
            let { macro, args = [], do_args, do_expressions } = match
            if (macro) explore_macro_identifier(macro.cursor, doc, scopestate, verbose)

            for (let { node: arg } of args) {
                if ((match = match_function_call_argument(arg)`${t.as("name")} = ${t.as("value")}`)) {
                    let { name, value } = match
                    if (value) scopestate = explore_variable_usage(value.cursor, doc, scopestate, verbose)
                } else {
                    scopestate = explore_variable_usage(arg.cursor, doc, scopestate, verbose)
                }
            }

            if (do_args && do_expressions) {
                // Cheating because lezer-julia isn't up to this task yet
                // TODO julia-lezer is up to the task now!!
                let inner_scope = lower_scope(scopestate)

                // Don't ask me why, but currently `do (x, y)` is parsed as `DoClauseArguments(ArgumentList(x, y))`
                // while an actual argumentslist, `do x, y` is parsed as `DoClauseArguments(BareTupleExpression(x, y))`
                let do_args_actually = do_args.firstChild
                if (do_args_actually.name === "Identifier") {
                    inner_scope = scopestate_add_definition(inner_scope, doc, do_args_actually)
                } else if (do_args_actually.name === "ArgumentList") {
                    for (let child of child_nodes(do_args_actually)) {
                        inner_scope = explorer_function_definition_argument(child, doc, inner_scope)
                    }
                } else if (do_args_actually.name === "BareTupleExpression") {
                    for (let child of child_nodes(do_args_actually)) {
                        inner_scope = explorer_function_definition_argument(child, doc, inner_scope)
                    }
                } else {
                    verbose && console.warn("Unrecognized do args", do_args_actually.toString())
                }

                for (let { node: expression } of do_expressions) {
                    inner_scope = explore_variable_usage(expression.cursor, doc, inner_scope, verbose)
                }
                return raise_scope(inner_scope, scopestate, cursor.to)
            }

            return scopestate
        } else if ((match = match_julia(cursor)`${t.as("macro", t.anything_that_fits(jl`@macro`))} ${t.many("args")}`)) {
            let { macro, args = [] } = match
            if (macro) explore_macro_identifier(macro.cursor, doc, scopestate, verbose)

            for (let { node: arg } of args) {
                scopestate = explore_variable_usage(arg.cursor, doc, scopestate, verbose)
            }
            return scopestate
        } else if (
            (match = match_julia(cursor)`
                struct ${t.as("defined_as")}
                    ${t.many("expressions")}
                end
            `) ??
            (match = match_julia(cursor)`
                mutable struct ${t.as("defined_as")}
                    ${t.many("expressions")}
                end
            `)
        ) {
            let { defined_as, expressions = [] } = match
            defined_as = narrow(defined_as)

            let inner_scope = lower_scope(scopestate)
            let outer_scope = fresh_scope()

            if (defined_as) ({ inner: inner_scope, outer: outer_scope } = explore_definition(defined_as.cursor, doc, inner_scope))

            // Struct body
            for (let { node: expression } of expressions) {
                if (cursor.name === "Identifier") {
                    // Nothing, this is just the name inside the struct blegh get it out of here
                } else if ((match = match_julia(expression)`${t.as("subject")}::${t.as("type")}`)) {
                    // We're in X::Y, and Y is a reference
                    let { subject, type } = match
                    inner_scope = explore_variable_usage(type.cursor, doc, inner_scope, verbose)
                } else if ((match = match_julia(expression)`${t.as("assignee")} = ${t.as("value")}`)) {
                    let { assignee, value } = match

                    // Yeah... we do the same `a::G` check again
                    if ((match = match_julia(assignee)`${t.as("subject")}::${t.as("type")}`)) {
                        let { subject, type } = match
                        inner_scope = explore_variable_usage(type.cursor, doc, inner_scope, verbose)
                    }
                    inner_scope = explore_variable_usage(value.cursor, doc, inner_scope, verbose)
                }
            }

            scopestate = raise_scope(inner_scope, scopestate, cursor.to)
            scopestate = merge_scope_state(scopestate, outer_scope)
            return scopestate
        } else if ((match = match_julia(cursor)`abstract type ${t.as("name")} end`)) {
            let { name } = match
            if (name) {
                let { outer } = explore_definition(name.cursor, doc, scopestate)
                scopestate = merge_scope_state(scopestate, outer)
            }
            return scopestate
        } else if ((match = match_julia(cursor)`quote ${t.many("body")} end`) ?? (match = match_julia(cursor)`:(${t.many("body")})`)) {
            // We don't use the match because I made `go_through_quoted_expression_looking_for_interpolations`
            // to take a cursor at the quoted expression itself
            for (let interpolation_cursor of go_through_quoted_expression_looking_for_interpolations(cursor)) {
                scopestate = explore_variable_usage(interpolation_cursor, doc, scopestate, verbose)
            }
            return scopestate
        } else if (
            (match = match_julia(cursor)`
                module ${t.as("name")}
                    ${t.many("expressions")}
                end
            `)
        ) {
            let { name, expressions = [] } = match

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
                locals: [],
            })

            for (let { node: expression } of expressions) {
                scopestate = explore_variable_usage(expression.cursor, doc, scopestate)
            }
            return scopestate
        } else if ((match = match_julia(cursor)`${t.as("prefix")}${t.as("string", t.String)}`)) {
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
        } else if ((match = match_julia(cursor)`${t.Number}${t.as("unit")}`)) {
            // This isn't that useful, just wanted to test (and show off) the template
            return explore_variable_usage(match.unit.cursor, doc, scopestate, verbose)
        } else if (
            (match = match_julia(cursor)`import ${t.any}: ${t.many("specifiers")}`) ??
            (match = match_julia(cursor)`using ${t.any}: ${t.many("specifiers")}`)
        ) {
            let { specifiers = [] } = match
            let match_selected_import_specifier = make_beautiful_specific_matcher((x) => jl_dynamic`import X: ${x}`)

            for (let { node: specifier } of specifiers) {
                if ((match = match_selected_import_specifier(specifier)`${t.as("name")} as ${t.as("alias")}`)) {
                    let { alias } = match
                    scopestate = scopestate_add_definition(scopestate, doc, alias)
                } else if ((match = match_selected_import_specifier(specifier)`${t.as("name", t.Identifier)}`)) {
                    let { name } = match
                    scopestate = scopestate_add_definition(scopestate, doc, name)
                } else {
                    verbose && console.warn("Hmmmm, I don't know what to do with this selected import specifier:", specifier)
                }
            }
            return scopestate
        } else if ((match = match_julia(cursor)`import ${t.many("specifiers")}`)) {
            let { specifiers = [] } = match

            let match_import_specifier = make_beautiful_specific_matcher((x) => jl_dynamic`import ${x}`)

            for (let { node: specifier } of specifiers) {
                if ((match = match_import_specifier(specifier)`${t.any} as ${t.as("alias")}`)) {
                    let { alias } = match
                    scopestate = scopestate_add_definition(scopestate, doc, alias)
                } else if ((match = match_import_specifier(specifier)`${t.as("package")}.${t.as("name", t.Identifier)}`)) {
                    scopestate = scopestate_add_definition(scopestate, doc, match.name)
                } else if ((match = match_import_specifier(specifier)`.${t.as("scoped")}`)) {
                    let scopedmatch = null
                    while ((scopedmatch = match_import_specifier(match.scoped)`.${t.as("scoped")}`)) {
                        match = scopedmatch
                    }
                    scopestate = scopestate_add_definition(scopestate, doc, match.scoped)
                } else if ((match = match_import_specifier(specifier)`${t.as("name", t.Identifier)}`)) {
                    scopestate = scopestate_add_definition(scopestate, doc, match.name)
                } else {
                    verbose && console.warn("Hmmm, I don't know what to do with this import specifier:", specifier)
                }
            }
            return scopestate
        } else if ((match = match_julia(cursor)`using ${t.many()}`)) {
            // Can't care less
            return scopestate
        } else if (
            (match = match_julia(cursor)`
                for ${t.many("bindings", t.something_with_the_same_type_as(jl`x in y`))};
                    ${t.many("expressions")}
                end
            `)
        ) {
            let for_loop_binding_template = create_specific_template_maker((arg) => jl_dynamic`for ${arg}; x end`)
            let for_loop_binding_match_julia =
                (cursor) =>
                (...args) => {
                    // @ts-ignore
                    return for_loop_binding_template(jl(...args)).match(cursor)
                }

            let { bindings, expressions } = match
            let inner_scope = lower_scope(scopestate)

            for (let { node: binding } of bindings) {
                let match = null
                if (
                    (match = for_loop_binding_match_julia(binding)`${t.as("name")} in ${t.as("range")}`) ??
                    (match = for_loop_binding_match_julia(binding)`${t.as("name")} ∈ ${t.as("range")}`) ??
                    (match = for_loop_binding_match_julia(binding)`${t.as("name")} = ${t.as("range")}`)
                ) {
                    let { name, range } = match
                    if (range) inner_scope = explore_variable_usage(range.cursor, doc, inner_scope, verbose)
                    if (name) inner_scope = explore_pattern(name, doc, inner_scope, range?.to ?? null, verbose)
                } else {
                    verbose && console.warn("Unrecognized for loop binding", binding.toString())
                }
            }

            for (let { node: expression } of expressions) {
                inner_scope = explore_variable_usage(expression.cursor, doc, inner_scope, verbose)
            }

            return raise_scope(inner_scope, scopestate, cursor.to)
        } else if (
            (match = match_julia(cursor)`
                ${t.as("callee")}(${t.many("args")}) ${t.maybe(jl`do ${t.maybe(t.many("do_args"))}
                    ${t.many("do_expressions")}
                end`)}
            `) ??
            (match = match_julia(cursor)`
                ${t.as("callee")}.(${t.many("args")})
            `)
        ) {
            let { callee, args = [], do_args = [], do_expressions = [] } = match

            scopestate = explore_variable_usage(callee.cursor, doc, scopestate, verbose)

            for (let { node: arg } of args) {
                let match = null
                if ((match = match_function_call_argument(arg)`; ${t.many("named_args")}`)) {
                    // "Parameters", the part in `f(x; y, z)` after the `;`
                    let { named_args = [] } = match
                    for (let { node: named_arg } of named_args) {
                        let match = null
                        if ((match = match_function_call_named_argument(named_arg)`${t.as("name")} = ${t.as("value")}`)) {
                            let { name, value } = match
                            scopestate = explore_variable_usage(value.cursor, doc, scopestate, verbose)
                        } else {
                            scopestate = explore_variable_usage(named_arg.cursor, doc, scopestate, verbose)
                        }
                    }
                } else if ((match = match_function_call_argument(arg)`${t.as("name")} = ${t.as("value")}`)) {
                    let { name, value } = match
                    if (value) scopestate = explore_variable_usage(value.cursor, doc, scopestate, verbose)
                } else if ((match = match_function_call_argument(arg)`${t.as("result")} ${t.many("clauses", t.anything_that_fits(jl`for x = y`))}`)) {
                    let { result, clauses } = match
                    let nested_scope = lower_scope(scopestate)
                    // Because of the `t.anything_that_fits`, we can now match different `for x ? y`'s and `if x`s manually.
                    // There might be a way to express this in the template, but this keeps templates a lot simpler yet powerful.
                    for (let { node: for_binding } of clauses) {
                        let match = null
                        if (
                            (match = match_for_binding(for_binding)`for ${t.as("variable")} = ${t.maybe(t.as("value"))}`) ??
                            (match = match_for_binding(for_binding)`for ${t.as("variable")} in ${t.maybe(t.as("value"))}`) ??
                            (match = match_for_binding(for_binding)`for ${t.as("variable")} ∈ ${t.maybe(t.as("value"))}`) ??
                            (match = match_for_binding(for_binding)`for ${t.as("variable")}`)
                        ) {
                            let { variable, value } = match

                            if (value) nested_scope = explore_variable_usage(value.cursor, doc, nested_scope, verbose)
                            if (variable) nested_scope = explore_pattern(variable, doc, nested_scope)
                        } else if ((match = match_for_binding(for_binding)`if ${t.maybe(t.as("if"))}`)) {
                            let { if: node } = match
                            if (node) nested_scope = explore_variable_usage(node.cursor, doc, nested_scope, verbose)
                        } else {
                            verbose && console.log("Hmmm, can't parse for binding", for_binding)
                        }
                    }

                    nested_scope = explore_variable_usage(result.cursor, doc, nested_scope, verbose)

                    return raise_scope(nested_scope, scopestate, cursor.to)
                } else {
                    scopestate = explore_variable_usage(arg.cursor, doc, scopestate, verbose)
                }
            }

            let inner_scope = lower_scope(scopestate)

            for (let { node: arg } of do_args) {
                inner_scope = explorer_function_definition_argument(arg, doc, inner_scope)
            }
            for (let { node: expression } of do_expressions) {
                inner_scope = explore_variable_usage(expression.cursor, doc, inner_scope, verbose)
            }
            return raise_scope(inner_scope, scopestate, cursor.to)
        } else if ((match = match_julia(cursor)`(${t.many("tuple_elements")},)`)) {
            // TODO.. maybe? `(x, g = y)` is a "ParenthesizedExpression", but lezer parses it as a tuple...
            // For now I fix it here hackily by checking if there is only NamedFields

            let { tuple_elements = [] } = match

            let match_tuple_element = make_beautiful_specific_matcher((arg) => jl_dynamic`(${arg},)`)

            let is_named_field = tuple_elements.map(({ node }) => match_tuple_element(cursor)`${t.Identifier} = ${t.any}` != null)

            if (is_named_field.every((x) => x === true) || is_named_field.every((x) => x === false)) {
                // Valid tuple, either named or unnamed
                for (let { node: element } of tuple_elements) {
                    let match = null
                    if ((match = match_tuple_element(cursor)`${t.as("name")} = ${t.as("value")}`)) {
                        let { name, value } = match
                        if (value) scopestate = explore_variable_usage(value.cursor, doc, scopestate, verbose)
                    } else {
                        scopestate = explore_variable_usage(element.cursor, doc, scopestate, verbose)
                    }
                }
            } else {
                // Sneaky! Actually an expression list 😏
                for (let { node: element } of tuple_elements) {
                    let match = null
                    if ((match = match_tuple_element(cursor)`${t.as("name")} = ${t.as("value")}`)) {
                        // 🚨 actually an assignment 🚨
                        let { name, value } = match
                        if (value) scopestate = explore_variable_usage(value.cursor, doc, scopestate, verbose)
                        if (name) scopestate = scopestate_add_definition(scopestate, doc, name, value?.to ?? null)
                    } else {
                        scopestate = explore_variable_usage(element.cursor, doc, scopestate, verbose)
                    }
                }
            }
            return scopestate
        } else if (
            (match = match_julia(cursor)`(${t.many("args")}) -> ${t.many("body")}`) ??
            (match = match_julia(cursor)`${t.as("arg")} -> ${t.many("body")}`) ??
            (match = match_julia(cursor)`${t.as("name")}(${t.many("args")})::${t.as("return_type")} = ${t.many("body")}`) ??
            (match = match_julia(cursor)`${t.as("name")}(${t.many("args")}) = ${t.many("body")}`) ??
            (match = match_julia(cursor)`${t.as("name")}(${t.many("args")}) = ${t.many("body", t.anything_that_fits(jl`x, y`))}`) ??
            (match = match_julia(cursor)`
                function ${t.as("name")}(${t.many("args")})::${t.as("return_type")} where ${t.as("type_param")}
                    ${t.many("body")}
                end
            `) ??
            (match = match_julia(cursor)`
                function ${t.as("name")}(${t.many("args")}) where ${t.as("type_param")}
                    ${t.many("body")}
                end
            `) ??
            (match = match_julia(cursor)`
                function ${t.as("name")}(${t.many("args")})::${t.as("return_type")}
                    ${t.many("body")}
                end
            `) ??
            (match = match_julia(cursor)`
                function ${t.as("name")}(${t.many("args")})
                    ${t.many("body")}
                end
            `) ??
            (match = match_julia(cursor)`
                function ${t.as("name", t.Identifier)} end
            `) ??
            // Putting macro definitions here too because they are very similar
            (match = match_julia(cursor)`macro ${t.as("macro_name")} end`) ??
            (match = match_julia(cursor)`
                macro ${t.as("macro_name")}(${t.many("args")})
                    ${t.many("body")}
                end
            `)
        ) {
            let { name, macro_name, arg, args = [], return_type, type_param, body = [] } = match

            if (arg) {
                args.push({ node: arg })
            }

            if (name) {
                scopestate = scopestate_add_definition(scopestate, doc, name)
            } else if (macro_name) {
                scopestate.definitions.set(`@${doc.sliceString(macro_name.from, macro_name.to)}`, {
                    from: macro_name.from,
                    to: macro_name.to,
                    valid_from: macro_name.to,
                })
            }

            let inner_scope = lower_scope(scopestate)
            if (type_param) {
                let match_where_types = make_beautiful_specific_matcher((x) => jl_dynamic`function X() where ${x} end`)
                let match_where_type = make_beautiful_specific_matcher((x) => jl_dynamic`function X() where {${x}} end`)

                let type_params = [{ node: type_param }]
                let multiple_types_match = match_where_types(type_param)`{${t.many("type_params")}}`
                if (multiple_types_match) {
                    type_params = multiple_types_match.type_params
                }

                for (let { node: type_param } of type_params) {
                    let match = null
                    if ((match = match_where_type(type_param)`${t.as("defined", t.Identifier)} <: ${t.as("parent_type")}`)) {
                        let { defined, parent_type } = match
                        inner_scope = explore_variable_usage(parent_type, doc, inner_scope, verbose)
                        inner_scope = scopestate_add_definition(inner_scope, doc, defined)
                    } else if ((match = match_where_type(type_param)`${t.as("defined", t.Identifier)}`)) {
                        let { defined } = match
                        inner_scope = scopestate_add_definition(inner_scope, doc, defined)
                    } else {
                        verbose && console.warn(`Can't handle type param:`, type_param)
                    }
                }
            }

            if (return_type) {
                inner_scope = explore_variable_usage(narrow(return_type).cursor, doc, inner_scope, verbose)
            }
            for (let { node: arg } of args) {
                inner_scope = explorer_function_definition_argument(arg.cursor, doc, inner_scope, verbose)
            }
            for (let { node: expression } of body) {
                inner_scope = explore_variable_usage(expression.cursor, doc, inner_scope, verbose)
            }
            return raise_scope(inner_scope, scopestate, cursor.to)
        } else if (
            (match = match_julia(cursor)`
                let ${t.many("assignments", jl`${t.as("assignee")} = ${t.as("value")}`)}
                    ${t.many("body", t.any)}
                end
            `)
        ) {
            let { assignments = [], body = [] } = match
            let innerscope = lower_scope(scopestate)
            for (let {
                match: { assignee, value },
            } of assignments) {
                // Explorer lefthandside in inner scope
                if (assignee) innerscope = explore_pattern(assignee, doc, innerscope, value?.to ?? null, verbose)
                // Explorer righthandside in the outer scope
                if (value) scopestate = explore_variable_usage(value.cursor, doc, scopestate, verbose)
            }
            // Explorer body in innerscope
            for (let { node: line } of body) {
                innerscope = explore_variable_usage(line.cursor, doc, innerscope, verbose)
            }
            return raise_scope(innerscope, scopestate, cursor.to)
        } else if (
            // A bit hard to see from the template, but these are array (and generator) comprehensions
            // e.g. [x for x in y]
            (match = match_julia(cursor)`[
                ${t.as("result")}
                ${t.many("clauses", t.anything_that_fits(jl`for x = y`))}
            ]`) ??
            // Are there syntax differences between Array or Generator expressions?
            // For now I treat them the same...
            // (Also this is one line because lezer doesn't parse multiline generator expressions yet)
            (match = match_julia(cursor)`(
                ${t.as("result")}
                ${t.many("clauses", t.anything_that_fits(jl`for x = y`))}
            )`)
        ) {
            let { result, clauses } = match

            let nested_scope = lower_scope(scopestate)

            // Because of the `t.anything_that_fits`, we can now match different `for x ? y`'s and `if x`s manually.
            // There might be a way to express this in the template, but this keeps templates a lot simpler yet powerful.
            for (let { node: for_binding } of clauses) {
                let match = null
                if (
                    (match = match_for_binding(for_binding)`for ${t.as("variable")} = ${t.maybe(t.as("value"))}`) ??
                    (match = match_for_binding(for_binding)`for ${t.as("variable")} in ${t.maybe(t.as("value"))}`) ??
                    (match = match_for_binding(for_binding)`for ${t.as("variable")} ∈ ${t.maybe(t.as("value"))}`) ??
                    (match = match_for_binding(for_binding)`for ${t.as("variable")}`)
                ) {
                    let { variable, value } = match

                    if (value) nested_scope = explore_variable_usage(value.cursor, doc, nested_scope, verbose)
                    if (variable) nested_scope = explore_pattern(variable, doc, nested_scope)
                } else if ((match = match_for_binding(for_binding)`if ${t.maybe(t.as("if"))}`)) {
                    let { if: node } = match
                    if (node) nested_scope = explore_variable_usage(node.cursor, doc, nested_scope, verbose)
                } else {
                    verbose && console.warn("Hmmm, can't parse for binding", for_binding)
                }
            }

            nested_scope = explore_variable_usage(result.cursor, doc, nested_scope, verbose)

            return raise_scope(nested_scope, scopestate, cursor.to)
        } else {
            if (verbose) {
                console.groupCollapsed(`Cycling through all children of`, cursor.name)
                console.log(`text:`, doc.sliceString(cursor.from, cursor.to))
                console.groupEnd()
            }

            // In most cases we "just" go through all the children separately
            for (let subcursor of child_cursors(cursor)) {
                scopestate = explore_variable_usage(subcursor, doc, scopestate, verbose)
            }
            return scopestate
        }
    } finally {
        verbose && console.groupEnd()
    }
}

/**
 * @type {StateField<ScopeState>}
 */
export let ScopeStateField = StateField.define({
    create(state) {
        try {
            let cursor = syntaxTree(state).cursor()
            let scopestate = explore_variable_usage(cursor, state.doc, undefined)
            return scopestate
        } catch (error) {
            console.error("Something went wrong while parsing variables...", error)
            return {
                usages: [],
                definitions: new Map(),
                locals: [],
            }
        }
    },

    update(value, tr) {
        try {
            if (syntaxTree(tr.state) != syntaxTree(tr.startState)) {
                let cursor = syntaxTree(tr.state).cursor()
                let scopestate = explore_variable_usage(cursor, tr.state.doc, undefined)
                return scopestate
            } else {
                return value
            }
        } catch (error) {
            console.error("Something went wrong while parsing variables...", error)
            return {
                usages: [],
                definitions: new Map(),
                locals: [],
            }
        }
    },
})
