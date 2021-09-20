import { syntaxTree, StateField, EditorView, Decoration } from "../../imports/CodemirrorPlutoSetup.js"

const matchingMark = Decoration.mark({ class: "cm-matchingBracket" })
const nonmatchingMark = Decoration.mark({ class: "cm-nonmatchingBracket" })

export const block_matcher_plugin = StateField.define({
    create() {
        return Decoration.none
    },
    update(deco, tr) {
        if (!tr.docChanged && !tr.selection) return deco
        let decorations = []
        let tree = syntaxTree(tr.state)

        for (let range of tr.state.selection.ranges) {
            if (!range.empty) continue

            let node = tree.resolve(range.head, -1)
            console.log(`node:`, node.name)

            if (node.name === "end") {
                node = node.parent.firstChild
            }

            if (node.name === "struct") node = node.parent.firstChild
            if (node.name === "StructDefinition") node = node.firstChild
            if (node.name === "mutable") {
                let possibly_end = node.parent.lastChild
                let did_match = possibly_end.name === "end"
                let mark = did_match ? matchingMark : nonmatchingMark

                let struct = node.parent.getChild("struct")
                if (struct) {
                    decorations.push(mark.range(node.from, struct.to))
                }

                if (did_match) {
                    decorations.push(mark.range(possibly_end.from, possibly_end.to))
                }
            }
            if (node.name === "struct") {
                let possibly_end = node.parent.lastChild
                let did_match = possibly_end.name === "end"
                let mark = did_match ? matchingMark : nonmatchingMark
                decorations.push(mark.range(node.from, node.to))

                if (did_match) {
                    decorations.push(mark.range(possibly_end.from, possibly_end.to))
                }
            }

            if (node.name === "quote") {
                let possibly_end = node.parent.lastChild
                let did_match = possibly_end.name === "end"
                let mark = did_match ? matchingMark : nonmatchingMark
                decorations.push(mark.range(node.from, node.to))

                if (did_match) {
                    decorations.push(matchingMark.range(possibly_end.from, possibly_end.to))
                }
            }

            if (node.name === "begin") {
                let possibly_end = node.parent.lastChild
                let did_match = possibly_end.name === "end"
                let mark = did_match ? matchingMark : nonmatchingMark
                decorations.push(mark.range(node.from, node.to))

                if (did_match) {
                    decorations.push(matchingMark.range(possibly_end.from, possibly_end.to))
                }
            }

            if (node.name === "do") {
                let possibly_end = node.parent.lastChild
                let did_match = possibly_end.name === "end"
                let mark = did_match ? matchingMark : nonmatchingMark
                decorations.push(mark.range(node.from, node.to))

                if (did_match) {
                    decorations.push(matchingMark.range(possibly_end.from, possibly_end.to))
                }
            }

            if (node.name === "for") {
                let possibly_end = node.parent.lastChild
                let did_match = possibly_end.name === "end"
                let mark = did_match ? matchingMark : nonmatchingMark
                decorations.push(mark.range(node.from, node.to))

                if (did_match) {
                    decorations.push(matchingMark.range(possibly_end.from, possibly_end.to))
                }
            }

            if (node.name === "let") {
                let possibly_end = node.parent.lastChild
                let did_match = possibly_end.name === "end"
                let mark = did_match ? matchingMark : nonmatchingMark
                decorations.push(mark.range(node.from, node.to))

                if (did_match) {
                    decorations.push(matchingMark.range(possibly_end.from, possibly_end.to))
                }
            }

            if (node.name === "macro") {
                let possibly_end = node.parent.lastChild
                let did_match = possibly_end.name === "end"
                let mark = did_match ? matchingMark : nonmatchingMark
                decorations.push(mark.range(node.from, node.to))

                if (did_match) {
                    decorations.push(matchingMark.range(possibly_end.from, possibly_end.to))
                }
            }

            if (node.name === "function") {
                let possibly_end = node.parent.lastChild
                let did_match = possibly_end.name === "end"
                let mark = did_match ? matchingMark : nonmatchingMark
                decorations.push(mark.range(node.from, node.to))

                if (did_match) {
                    decorations.push(matchingMark.range(possibly_end.from, possibly_end.to))
                }
            }

            if (node.name === "while") {
                let possibly_end = node.parent.lastChild
                let did_match = possibly_end.name === "end"
                let mark = did_match ? matchingMark : nonmatchingMark
                decorations.push(mark.range(node.from, node.to))

                if (did_match) {
                    decorations.push(matchingMark.range(possibly_end.from, possibly_end.to))
                }
            }

            if (node.name === "type") node = node.parent.firstChild
            if (node.name === "AbstractDefinition") node = node.firstChild
            if (node.name === "PrimitiveDefinition") node = node.firstChild
            if (node.name === "abstract" || node.name === "primitive") {
                let possibly_end = node.parent.lastChild
                let did_match = possibly_end.name === "end"
                let mark = did_match ? matchingMark : nonmatchingMark

                let struct = node.parent.getChild("type")
                if (struct) {
                    decorations.push(matchingMark.range(node.from, struct.to))
                }

                if (did_match) {
                    decorations.push(matchingMark.range(possibly_end.from, possibly_end.to))
                }
            }

            if (node.name === "catch") node = node.parent
            if (node.name === "try" || node.name === "CatchClause") {
                let try_node = node.parent.firstChild

                let possibly_end = node.parent.lastChild
                let did_match = possibly_end.name === "end"
                let mark = did_match ? matchingMark : nonmatchingMark
                decorations.push(mark.range(try_node.from, try_node.to))

                let catch_node = node.parent.getChild("CatchClause")
                if (catch_node) {
                    decorations.push(matchingMark.range(catch_node.from, catch_node.to))
                }

                if (did_match) {
                    decorations.push(matchingMark.range(possibly_end.from, possibly_end.to))
                }
            }

            if (node.name === "else") node = node.parent
            if (node.name === "if" || node.name === "ElseClause" || node.name === "elseif") {
                let try_node = node.parent.firstChild

                let possibly_end = node.parent.lastChild
                let did_match = possibly_end.name === "end"
                let mark = did_match ? matchingMark : nonmatchingMark
                decorations.push(mark.range(try_node.from, try_node.to))

                for (let catch_clause_node of node.parent.getChildren("ElseClause")) {
                    let catch_node = catch_clause_node.firstChild
                    decorations.push(matchingMark.range(catch_node.from, catch_node.to))
                }
                for (let catch_node of node.parent.getChildren("elseif")) {
                    decorations.push(matchingMark.range(catch_node.from, catch_node.to))
                }
                if (did_match) {
                    decorations.push(matchingMark.range(possibly_end.from, possibly_end.to))
                }
            }
        }
        return Decoration.set(decorations, true)
    },
    provide: (f) => EditorView.decorations.from(f),
})
