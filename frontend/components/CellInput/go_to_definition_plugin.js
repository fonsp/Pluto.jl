import { syntaxTree, Facet, ViewPlugin, Decoration, StateField, EditorView, EditorSelection, EditorState } from "../../imports/CodemirrorPlutoSetup.js"
import { ctrl_or_cmd_name, has_ctrl_or_cmd_pressed } from "../../common/KeyboardShortcuts.js"
import _ from "../../imports/lodash.js"

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
 * @param {import("../../imports/CodemirrorPlutoSetup.js").TreeCursor} cursor
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

let children = function* (cursor) {
    if (cursor.firstChild()) {
        try {
            do {
                yield cursor
            } while (cursor.nextSibling())
        } finally {
            cursor.parent()
        }
    }
}

let all_children = function* (cursor) {
    for (let child of children(cursor)) {
        yield* all_children(child)
    }
}

/**
 * @param {import("../../imports/CodemirrorPlutoSetup.js").TreeCursor} cursor
 */
let go_through_quoted_expression_looking_for_interpolations = function* (cursor) {
    if (cursor.name !== "QuoteExpression") throw new Error("Expected QuotedExpression")

    for (let child of all_children(cursor)) {
        // @ts-ignore
        if (child.name === "InterpolationExpression") {
            yield cursor
        }
    }
}

/**
 * @param {import("../../imports/CodemirrorPlutoSetup.js").TreeCursor} cursor
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
        if (cursor.name === "Symbol") {
            // Nothing, ha!
        } else if (cursor.name === "AbstractDefinition") {
            // Also nothing!
        } else if (cursor.name === "StructDefinition" && cursor.firstChild()) {
            try {
                // @ts-ignore
                if (cursor.name === "mutable") cursor.nextSibling()
                // @ts-ignore
                if (cursor.name === "struct") cursor.nextSibling()

                // We're at the identifier (possibly ParameterizedIdentifier)
                // @ts-ignore
                if (cursor.name === "Identifier") {
                    let name = doc.sliceString(cursor.from, cursor.to)
                    scopestate.definitions.set(name, {
                        from: cursor.from,
                        to: cursor.to,
                    })
                    cursor.nextSibling()
                }
                // @ts-ignore
                if (cursor.name === "ParameterizedIdentifier" && cursor.firstChild()) {
                    try {
                        let name = doc.sliceString(cursor.from, cursor.to)
                        scopestate.definitions.set(name, {
                            from: cursor.from,
                            to: cursor.to,
                        })

                        cursor.nextSibling() // Typed part
                        scopestate = merge_scope_state(scopestate, explore_variable_usage(cursor, doc, scopestate))
                    } finally {
                        cursor.parent()
                    }
                    cursor.nextSibling()
                }

                // @ts-ignore
                if (cursor.name === "TypedExpression" && cursor.node.getChildren("Identifier").length === 1) {
                    scopestate = merge_scope_state(scopestate, explore_variable_usage(cursor, doc, scopestate))
                    cursor.nextSibling()
                }

                // We are now in the actual struct body
                do {
                    // @ts-ignore
                    if (cursor.name === "Identifier") {
                        // Nothing, this is just the name inside the struct blegh get it out of here
                    }
                    // @ts-ignore
                    if (cursor.name === "TypedExpression") {
                        // We're in X::Y, and Y is a reference
                        scopestate = merge_scope_state(scopestate, explore_variable_usage(cursor.node.lastChild.cursor, doc, scopestate))
                    }
                    // I'm not so sure about this
                    // @ts-ignore
                    if (cursor.name === "AssignmentExpression" && cursor.firstChild()) {
                        try {
                            if (cursor.name === "Identifier") {
                                // Nothing, this is just the name inside the struct blegh get it out of here
                            }
                            if (cursor.name === "TypedExpression") {
                                // We're in X::Y, and Y is a reference
                                scopestate = merge_scope_state(scopestate, explore_variable_usage(cursor.node.lastChild.cursor, doc, scopestate))
                            }

                            cursor.nextSibling()
                            cursor.nextSibling()

                            // We're in X::Y, and Y is a reference
                            scopestate = merge_scope_state(scopestate, explore_variable_usage(cursor, doc, scopestate))
                        } finally {
                            cursor.parent()
                        }
                    }
                } while (cursor.nextSibling())
            } finally {
                cursor.parent()
            }
        } else if (cursor.name === "QuoteExpression") {
            for (let interpolation_cursor of go_through_quoted_expression_looking_for_interpolations(cursor)) {
                scopestate = merge_scope_state(scopestate, explore_variable_usage(interpolation_cursor, doc, scopestate))
            }
            verbose && console.log("Interpolating over")
        } else if (cursor.name === "ModuleDefinition" && cursor.firstChild()) {
            // Ugh..
            try {
                // First child is "module", next child is the name
                cursor.nextSibling()
                let name = doc.sliceString(cursor.from, cursor.to)
                scopestate.definitions.set(name, {
                    from: cursor.from,
                    to: cursor.to,
                })

                // Next children are the body
                // These have a new scope, not even escaping definitions
                /** @type {ScopeState} */
                let module_scopestate = {
                    usages: new Set(),
                    definitions: new Map(),
                }
                while (cursor.nextSibling()) {
                    module_scopestate = merge_scope_state(module_scopestate, explore_variable_usage(cursor, doc, module_scopestate))
                }
                // We still merge the module scopestate with the global scopestate, but only the usages that don't escape.
                // (Later we can have also shadowed definitions for the dimming of unused variables)
                scopestate = merge_scope_state(scopestate, {
                    usages: new Set(Array.from(module_scopestate.usages).filter((x) => x.definition != null)),
                    definitions: new Map(),
                })
            } finally {
                cursor.parent()
            }
        } else if (cursor.name === "CompoundExpression" && cursor.firstChild()) {
            // begin ... end, go through all the children one by one and keep adding their definitions
            try {
                do {
                    scopestate = merge_scope_state(scopestate, explore_variable_usage(cursor, doc, scopestate))
                } while (cursor.nextSibling())
            } finally {
                cursor.parent()
            }
        } else if (cursor.name === "ImportStatement" && cursor.firstChild()) {
            try {
                // let is_using = cursor.name === "using"
                cursor.nextSibling()

                // @ts-ignore
                if (cursor.name === "Import" && cursor.firstChild()) {
                    do {
                        let node = cursor.node
                        if (cursor.name === "Identifier") {
                            // node = node 🤷‍♀️
                        }
                        if (cursor.name === "RenamedIdentifier") {
                            node = node.lastChild
                        }

                        let name = doc.sliceString(node.from, node.to)
                        scopestate.definitions.set(name, {
                            from: cursor.from,
                            to: cursor.to,
                        })
                    } while (cursor.nextSibling())
                    cursor.parent()
                }

                // @ts-ignore
                if (cursor.name === "SelectedImport") {
                    // First child is the module we are importing from, so we skip to the next child
                    for (let child of children(cursor)) {
                        let node = cursor.node
                        if (cursor.name === "Identifier") {
                            // node = node 🤷‍♀️
                        }
                        if (cursor.name === "RenamedImport") {
                            node = node.lastChild
                        }
                        let name = doc.sliceString(node.from, node.to)
                        scopestate.definitions.set(name, {
                            from: cursor.from,
                            to: cursor.to,
                        })
                    }
                }
            } finally {
                cursor.parent()
            }
        } else if (cursor.name === "ForStatement" && cursor.firstChild()) {
            try {
                let nested_scope = {
                    usages: new Set(),
                    definitions: new Map(scopestate.definitions),
                }

                // @ts-ignore
                if (cursor.name === "for") {
                    cursor.nextSibling()
                }

                // @ts-ignore
                if (cursor.name === "ForBinding" && cursor.firstChild()) {
                    try {
                        for (let variable_node of get_variables_from_assignment(cursor)) {
                            let name = doc.sliceString(variable_node.from, variable_node.to)
                            nested_scope.definitions.set(name, {
                                from: variable_node.from,
                                to: variable_node.to,
                            })
                        }
                        cursor.nextSibling()

                        // @ts-ignore
                        if (cursor.name === "in") {
                            cursor.nextSibling()
                        }

                        // Right hand side of `for ... in ...`
                        scopestate = merge_scope_state(scopestate, explore_variable_usage(cursor, doc, scopestate))
                    } finally {
                        cursor.parent()
                    }
                }

                cursor.nextSibling()

                // Go through the expressions in the for body
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
                    if (cursor.name === "Identifier") {
                        let name = doc.sliceString(cursor.from, cursor.to)
                        if (in_macro) {
                            name = `@${name}`
                        }
                        // Add the full node as position, so it selects the whole thing
                        // scopestate.definitions.set(name, { from: full_node.from, to: full_node.to })
                        scopestate.definitions.set(name, { from: cursor.from, to: cursor.to })
                        cursor.nextSibling()
                    }

                    let nested_scope = {
                        usages: new Set(),
                        definitions: new Map(scopestate.definitions),
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
        let scopestate = explore_variable_usage(cursor, state.doc)
        return scopestate
    },

    update(value, tr) {
        if (tr.docChanged) {
            let cursor = syntaxTree(tr.state).cursor()
            let scopestate = explore_variable_usage(cursor, tr.state.doc)
            return scopestate
        } else {
            return value
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
