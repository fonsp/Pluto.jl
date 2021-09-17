import { EditorState, syntaxTree } from "../../imports/CodemirrorPlutoSetup.js"

/** @param {EditorState} state */
export let get_selected_doc_from_state = (state) => {
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
            console.group(`Iteration #${iterations}`)
            console.log("cursor.name", cursor.name)

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

            // `callee(...)` should yield "callee"
            // (Only if it is on the `(` or `)`, or in like a space,
            //    not on arguments (those are handle later))
            if (cursor.name === "CallExpression") {
                cursor.firstChild() // Move to callee
                return state.doc.sliceString(cursor.from, cursor.to)
            }

            // For identifiers in typed expressions e.g. `a::Number` always show the type
            if (cursor.name === "Identifier" && parents[0] === "TypedExpression") {
                cursor.next(false)
                parents.shift()
            }
            // For the :: inside a typed expression, show the type
            if (cursor.name === "TypedExpression") {
                cursor.lastChild() // Move to callee
                return state.doc.sliceString(cursor.from, cursor.to)
            }

            // For Identifiers, we expand them in the hopes
            if (cursor.name === "Identifier") {
                let current_node = cursor.node
                while (cursor.parent()) {
                    if (cursor.name === "FieldExpression" && current_node.to === cursor.to) {
                        // Expand our node to any field expressions to the left
                        current_node = cursor.node
                    } else if (cursor.name === "MacroIdentifier" || cursor.name === "MacroFieldExpression") {
                        current_node = cursor.node
                    } else {
                        cursor = current_node.cursor
                        break
                    }
                }
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

            // Not sure what this was for... TODO: Remove?
            if (
                (parents[0] === "FunctionAssignmentExpression" || parents[0] === "FunctionDefinition") &&
                cursor.name !== "ArgumentList" &&
                (cursor.node.prevSibling == null || cursor.node.prevSibling === "function")
            ) {
                return undefined
            }

            // Identifier that's actually a symbol? Not useful at all!
            if (cursor.name === "Identifier" && parents[0] === "Symbol") {
                continue
            }

            // Move to name definition
            if (cursor.name === "FunctionDefinition") {
                cursor.firstChild()
                cursor.next(false)
                return state.doc.sliceString(cursor.from, cursor.to)
            }
            if (cursor.name === "FunctionAssignmentExpression") {
                cursor.firstChild()
                return state.doc.sliceString(cursor.from, cursor.to)
            }
            if (cursor.name === "MacroExpression") {
                cursor.firstChild()
                return state.doc.sliceString(cursor.from, cursor.to)
            }
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
                cursor.name === "Identifier" ||
                cursor.name === "FieldExpression" ||
                cursor.name === "MacroIdentifier" ||
                cursor.name === "MacroFieldExpression" ||
                cursor.name === "Operator" ||
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

            //return state.doc.sliceString(cursor.from, cursor.to)
            console.groupEnd()
        } while (cursor.parent())
    } else {
        return state.doc.sliceString(selection.from, selection.to).trim()
    }
}
