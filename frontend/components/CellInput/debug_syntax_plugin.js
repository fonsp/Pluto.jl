import { EditorView, syntaxTree, syntaxTreeAvailable, Text } from "../../imports/CodemirrorPlutoSetup.js"
import { iterate_with_cursor } from "./lezer_template.js"

/**
 * @param {Text} doc
 * @param {ReturnType<typeof syntaxTree>} tree
 */
let find_error_nodes = (doc, tree) => {
    iterate_with_cursor({
        tree: tree,
        enter: (cursor) => {
            if (cursor.type.isError) {
                console.group(`Found error node in ${cursor.node.parent?.name}`)
                try {
                    let text_before_cursor = doc.sliceString(cursor.from - 10, cursor.from)
                    let text = doc.sliceString(cursor.from, cursor.to)
                    let text_after_cursor = doc.sliceString(cursor.to, cursor.to + 10)

                    if (text === "") {
                        console.log(`${text_before_cursor}⚠${text_after_cursor}`)
                        console.log(`${" ".repeat(text_before_cursor.length)}^$${" ".repeat(text_after_cursor.length)}`)
                    } else {
                        console.log(`${text_before_cursor}${text}${text_after_cursor}`)
                        console.log(`${" ".repeat(text_before_cursor.length)}${"^".repeat(text.length)}$${" ".repeat(text_after_cursor.length)}`)
                    }
                } finally {
                    console.groupEnd()
                }
                return false
            }
        },
        leave: () => {},
    })
}

export const debug_syntax_plugin = EditorView.updateListener.of((update) => {
    if (update.docChanged || update.selectionSet || syntaxTree(update.state) !== syntaxTree(update.startState)) {
        if (syntaxTreeAvailable(update.state)) {
            let state = update.state
            console.group("Selection")
            try {
                console.groupCollapsed("Lezer tree")
                try {
                    console.log(syntaxTree(state).toString())
                } finally {
                    console.groupEnd()
                }
                console.groupCollapsed("Document text")
                try {
                    console.log(update.state.doc.sliceString(0, update.state.doc.length))
                } finally {
                    console.groupEnd()
                }
                console.group("Lezer errors")
                try {
                    find_error_nodes(update.state.doc, syntaxTree(state))
                } finally {
                    console.groupEnd()
                }
            } finally {
                console.groupEnd()
            }
        } else {
            console.log("⚠️ Full syntax tree not available")
        }
    }
})
