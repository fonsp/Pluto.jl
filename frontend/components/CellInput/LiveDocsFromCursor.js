import { EditorState, syntaxTree } from "../../imports/CodemirrorPlutoSetup.js"

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
        cursor.moveTo(selection.to, -1)

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

                verbose && console.log(`parents:`, parents)

                // `callee(...)` should yield "callee"
                // (Only if it is on the `(` or `)`, or in like a space,
                //    not on arguments (those are handle later))
                if (cursor.name === "CallExpression") {
                    cursor.firstChild() // Move to callee
                    return state.doc.sliceString(cursor.from, cursor.to)
                }

                if (cursor.name === "ParameterizedIdentifier") {
                    cursor.firstChild() // Move to callee
                    return state.doc.sliceString(cursor.from, cursor.to)
                }

                // `html"asd"` should yield "html"
                if (cursor.name === "Identifier" && parents[0] === "PrefixedString") {
                    continue
                }
                if (cursor.name === "PrefixedString") {
                    cursor.firstChild() // Move to callee
                    let name = state.doc.sliceString(cursor.from, cursor.to)
                    return `${name}"`
                }

                // For identifiers in typed expressions e.g. `a::Number` always show the type
                if (cursor.name === "Identifier" && parents[0] === "TypedExpression") {
                    cursor.parent() // Move to TypedExpression
                    cursor.lastChild() // Move to type Identifier
                    return state.doc.sliceString(cursor.from, cursor.to)
                }
                // For the :: inside a typed expression, show the type
                if (cursor.name === "TypedExpression") {
                    cursor.lastChild() // Move to callee
                    return state.doc.sliceString(cursor.from, cursor.to)
                }

                // Docs for spread operator when you're in a SpreadExpression
                if (cursor.name === "SpreadExpression") {
                    return "..."
                }

                // For Identifiers, we expand them in the hopes of finding preceding (left side) parts.
                // So we make sure we don't move to the left (`to` stays the same) and then possibly expand
                let identifier_parts = ["Identifier", "FieldExpression", "SubscriptExpression", "MacroFieldExpression"]
                if (parent != null && parent.to === cursor.to) {
                    if (identifier_parts.includes(cursor.name) && identifier_parts.includes(parent.name)) {
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
                    parents[0] === "ArgumentList" &&
                    (parents[1] === "FunctionAssignmentExpression" || parents[1] === "FunctionDefinition")
                ) {
                    continue
                }

                // Identifier that's actually a symbol? Not useful at all!
                if (cursor.name === "Identifier" && parents[0] === "Symbol") {
                    continue
                }

                // If we happen to be anywhere else in a function declaration, we want the function name
                // `function X() ... end` should yield `X`
                if (cursor.name === "FunctionDefinition") {
                    cursor.firstChild() // "function"
                    cursor.next(false) // Identifier
                    return state.doc.sliceString(cursor.from, cursor.to)
                }
                // `X() = ...` should yield `X`
                if (cursor.name === "FunctionAssignmentExpression") {
                    cursor.firstChild() // Identifier
                    return state.doc.sliceString(cursor.from, cursor.to)
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
                    cursor.name === "Operator" ||
                    identifier_parts.includes(cursor.name) ||
                    keywords_that_have_docs_and_are_cool.includes(cursor.name)
                    // keywords_that_have_docs.includes(cursor.name)
                ) {
                    return state.doc.sliceString(cursor.from, cursor.to)
                }

                // If you get here (so you have no cool other matches) and your parent is a FunctionDefinition,
                // I don't want to show you the function name, so imma head out.
                if (parents[0] === "FunctionDefinition") {
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
