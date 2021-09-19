import { EditorState, syntaxTree } from "../../imports/CodemirrorPlutoSetup.js"

let get_variables_from_assignment = (cursor) => {
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

let get_local_variables = (cursor) => {
    let local_variables = []
    do {
        if (cursor.name === "FunctionDefinition" && cursor.firstChild()) {
            // Find ArgumentList
            do {
                if (cursor.name !== "ArgumentList") continue
                // Cycle through arguments
                if (cursor.firstChild()) {
                    do {
                        local_variables.push(...get_variables_from_assignment(cursor))
                    } while (cursor.nextSibling())
                    cursor.parent()
                }
            } while (cursor.nextSibling())
            cursor.parent()
        }

        if (cursor.name === "LetStatement" && cursor.firstChild()) {
            do {
                if (cursor.name === "VariableDeclaration" && cursor.firstChild()) {
                    local_variables.push(...get_variables_from_assignment(cursor))
                    cursor.parent()
                }
            } while (cursor.nextSibling())
            cursor.parent()
        }

        // When in a block-ish node (FunctionDefinition, but later also begin, let, if, etc)
        // we go backwards from where we are, collecting any assignment-like nodes.
        // Later we could even go into begin blocks, but that would be a bit more complicated.
        let parent = cursor.node.parent
        do {
            if (cursor.name === "LocalStatement" || cursor.name === "ConstStatement" || cursor.name === "GlobalStatement") {
                if (cursor.firstChild()) {
                    do {
                        if (cursor.name === "VariableDeclaration" && cursor.firstChild()) {
                            local_variables.push(...get_variables_from_assignment(cursor))
                            cursor.parent()
                        }
                    } while (cursor.nextSibling())
                    cursor.parent()
                }
            }

            if (cursor.name === "AssignmentExpression" && cursor.firstChild()) {
                local_variables.push(...get_variables_from_assignment(cursor))
                cursor.parent()
            }
            if (cursor.name === "ForBinding" && cursor.firstChild()) {
                local_variables.push(...get_variables_from_assignment(cursor))
                cursor.parent()
            }
            if (cursor.name === "ArrayComprehensionExpression" && cursor.firstChild()) {
                cursor.nextSibling()
                if (cursor.name === "ForClause" && cursor.firstChild()) {
                    do {
                        if (cursor.name === "ForBinding" && cursor.firstChild()) {
                            local_variables.push(...get_variables_from_assignment(cursor))
                            cursor.parent()
                        }
                    } while (cursor.nextSibling())
                    cursor.parent()
                }
                cursor.parent()
            }
        } while (cursor.prevSibling())
    } while (cursor.parent())
    return local_variables
}

let get_root_variable_from_expression = (cursor) => {
    if (cursor.name === "SubscriptExpression") {
        cursor.firstChild()
        return get_root_variable_from_expression(cursor)
    }
    if (cursor.name === "FieldExpression") {
        cursor.firstChild()
        return get_root_variable_from_expression(cursor)
    }
    if (cursor.name === "Identifier") {
        cursor.firstChild()
        return cursor.node
    }
    return null
}

let VALID_DOCS_TYPES = ["Identifier", "FieldExpression", "SubscriptExpression", "MacroFieldExpression", "Operator", "ParameterizedIdentifier"]

let is_docs_searchable = (cursor) => {
    if (VALID_DOCS_TYPES.includes(cursor.name)) {
        if (cursor.firstChild()) {
            do {
                // Numbers themselves can't be docs searched, but using numbers inside SubscriptExpression can be.
                if (cursor.name === "Number") {
                    continue
                }
                // This is for the VERY specific case like `Vector{Int}(1,2,3,4) which I want to yield `Vector{Int}`
                if (cursor.name === "TypeArgumentList") {
                    continue
                }
                if (!is_docs_searchable(cursor)) {
                    return false
                }
            } while (cursor.nextSibling())
            cursor.parent()
            return true
        } else {
            return true
        }
    } else {
        return false
    }
}

/** @param {EditorState} state */
export let get_selected_doc_from_state = (state, verbose = false) => {
    let selection = state.selection.main

    if (selection.from === selection.to) {
        // If the cell starts with a questionmark, we interpret it as a
        // docs query, so I'm gonna spit out exactly what the user typed.
        let current_line = state.doc.lineAt(selection.from).text
        if (current_line[0] === "?") {
            return current_line.slice(1)
        }

        let tree = syntaxTree(state)
        let cursor = tree.cursor()
        verbose && console.log(`Full tree:`, cursor.toString())
        cursor.moveTo(selection.to, -1)

        let local_variables = get_local_variables(cursor.node.cursor).map((node) => state.doc.sliceString(node.from, node.to))
        verbose && console.log(`local_variables:`, local_variables)

        let iterations = 0

        do {
            verbose && console.group(`Iteration #${iterations}`)
            try {
                verbose && console.log("cursor", cursor.toString())

                // Just to make sure we don't accidentally end up in an infinite loop
                if (iterations > 100) {
                    console.group("Infinite loop while checking docs")
                    console.log("Selection:", selection, state.doc.sliceString(selection.from, selection.to).trim())
                    console.log("Current node:", cursor.name, state.doc.sliceString(cursor.from, cursor.to).trim())
                    console.groupEnd()
                    break
                }
                iterations = iterations + 1

                // Collect parents in a list so I can compare them easily
                let parent_cursor = cursor.node.cursor
                let parents = []
                while (parent_cursor.parent()) {
                    parents.push(parent_cursor.name)
                }
                // Also just have the first parent as a node
                let parent = cursor.node.parent
                if (parent == null) {
                    break
                }

                verbose && console.log(`parents:`, parents)

                // `callee(...)` should yield "callee"
                // (Only if it is on the `(` or `)`, or in like a space,
                //    not on arguments (those are handle later))
                if (cursor.name === "CallExpression") {
                    cursor.firstChild() // Move to callee
                    return is_docs_searchable(cursor) ? state.doc.sliceString(cursor.from, cursor.to) : undefined
                }

                if (cursor.name === "ParameterizedIdentifier") {
                    cursor.firstChild() // Move to callee
                    return is_docs_searchable(cursor) ? state.doc.sliceString(cursor.from, cursor.to) : undefined
                }

                // `html"asd"` should yield "html"
                if (cursor.name === "Identifier" && parent.name === "PrefixedString") {
                    continue
                }
                if (cursor.name === "PrefixedString") {
                    cursor.firstChild() // Move to callee
                    let name = state.doc.sliceString(cursor.from, cursor.to)
                    return `${name}"`
                }

                // For identifiers in typed expressions e.g. `a::Number` always show the type
                if (cursor.name === "Identifier" && parent.name === "TypedExpression") {
                    cursor.parent() // Move to TypedExpression
                    cursor.lastChild() // Move to type Identifier
                    return is_docs_searchable(cursor) ? state.doc.sliceString(cursor.from, cursor.to) : undefined
                }
                // For the :: inside a typed expression, show the type
                if (cursor.name === "TypedExpression") {
                    cursor.lastChild() // Move to callee
                    return is_docs_searchable(cursor) ? state.doc.sliceString(cursor.from, cursor.to) : undefined
                }

                // Docs for spread operator when you're in a SpreadExpression
                if (cursor.name === "SpreadExpression") {
                    return "..."
                }

                // For Identifiers, we expand them in the hopes of finding preceding (left side) parts.
                // So we make sure we don't move to the left (`to` stays the same) and then possibly expand
                if (parent.to === cursor.to) {
                    if (VALID_DOCS_TYPES.includes(cursor.name) && VALID_DOCS_TYPES.includes(parent.name)) {
                        continue
                    }
                }

                // If we are an identifier inside a NamedField, we want to show whatever we are a named part of
                // EXEPT, when we are in the last part (the value) of a NamedField, because then we can show
                // the value.
                if (cursor.name === "Identifier" && parent.name === "NamedField") {
                    if (parent.lastChild.from != cursor.from && parent.lastChild.to != cursor.to) {
                        continue
                    }
                }

                // `a = 1` would yield `=`, `a += 1` would yield `+=`
                if (cursor.name === "AssignmentExpression") {
                    let end_of_first = cursor.node.firstChild.to
                    let beginning_of_last = cursor.node.lastChild.from
                    return state.doc.sliceString(end_of_first, beginning_of_last).trim()
                }

                // If we happen to be in an argumentslist, we should go to the parent
                if (cursor.name === "ArgumentList") {
                    continue
                }
                // If we are on an identifiers inside the argumentslist of a function *declaration*,
                // we should go to the parent.
                if (
                    cursor.name === "Identifier" &&
                    parent.name === "ArgumentList" &&
                    (parent.parent.name === "FunctionAssignmentExpression" || parent.parent.name === "FunctionDefinition")
                ) {
                    continue
                }

                // Identifier that's actually a symbol? Not useful at all!
                if (cursor.name === "Identifier" && parent.name === "Symbol") {
                    continue
                }

                // If we happen to be anywhere else in a function declaration, we want the function name
                // `function X() ... end` should yield `X`
                if (cursor.name === "FunctionDefinition") {
                    cursor.firstChild() // "function"
                    cursor.nextSibling() // Identifier
                    return return_if_valid_docs_type(state, cursor)
                }
                // `X() = ...` should yield `X`
                if (cursor.name === "FunctionAssignmentExpression") {
                    cursor.firstChild() // Identifier
                    return return_if_valid_docs_type(state, cursor)
                }

                if (cursor.name === "Identifier" && parent.name === "MacroIdentifier") {
                    continue
                }

                // `@X` should yield `X`
                if (cursor.name === "MacroExpression") {
                    cursor.firstChild()
                    return state.doc.sliceString(cursor.from, cursor.to)
                }

                // `1 + 1` should yield `+`
                // A bit odd, but we don't get the span of the actual operator in a binary expression,
                // so we infer it from the end of the left side and start of the right side.
                if (cursor.name === "BinaryExpression") {
                    let end_of_first = cursor.node.firstChild.to
                    let beginning_of_last = cursor.node.lastChild.from
                    return state.doc.sliceString(end_of_first, beginning_of_last).trim()
                }

                // Putting in a special case for ternary expressions (a ? b : c) because I think
                // these might be confusing to new users so I want to extra show them docs about it.
                // Sad thing is, our current docs think that `?:` means "give me info about :", so
                // TODO Make Pluto treat `?` prefixes (or specifically `?:`) as normal identifiers
                if (cursor.name === "TernaryExpression") {
                    return "??:"
                }

                // Sure these keywords could be useful, but I think it's a bit much to show docs for everyone
                let keywords_that_have_docs = ["function", "macro", "end", "begin", "let", "if", "else", "try", "catch", "finally"]
                // These keywords however are a bit more useful to show docs for
                let keywords_that_have_docs_and_are_cool = ["import", "export", "try", "catch", "finally"]
                if (
                    VALID_DOCS_TYPES.includes(cursor.name) ||
                    keywords_that_have_docs_and_are_cool.includes(cursor.name)
                    // keywords_that_have_docs.includes(cursor.name)
                ) {
                    if (!is_docs_searchable(cursor)) {
                        return undefined
                    }

                    // When we can already see that a variable is local, we don't want to show docs for it
                    // because we won't be able to load it in anyway.
                    let root_variable_node = get_root_variable_from_expression(cursor.node.cursor)
                    if (root_variable_node == null) {
                        return state.doc.sliceString(cursor.from, cursor.to)
                    }
                    let root_variable_name = state.doc.sliceString(root_variable_node.from, root_variable_node.to)
                    if (!local_variables.includes(root_variable_name)) {
                        return state.doc.sliceString(cursor.from, cursor.to)
                    }
                }

                // If you get here (so you have no cool other matches) and your parent is a FunctionDefinition,
                // I don't want to show you the function name, so imma head out.
                if (parent.name === "FunctionDefinition") {
                    return undefined
                }
                // If we are expanding to an AssigmentExpression, we DONT want to show `=`
                if (parent.name === "AssignmentExpression") {
                    return undefined
                }
            } finally {
                verbose && console.groupEnd()
            }
        } while (cursor.parent())
    } else {
        return state.doc.sliceString(selection.from, selection.to).trim()
    }
}
