import {
    EditorSelection,
    EditorState,
    getIndentation,
    IndentContext,
    indentString,
    NodeProp,
    syntaxTree,
    Text,
    TreeCursor,
    isolateHistory,
} from "../../imports/CodemirrorPlutoSetup.js"

let ENABLE_AUTOMATIC_END_INSERTION = true

function isBetweenBrackets(state, pos) {
    if (/\(\)|\[\]|\{\}/.test(state.sliceDoc(pos - 1, pos + 1))) return { from: pos, to: pos }
    if (/""""""/.test(state.sliceDoc(pos - 3, pos + 3))) return { from: pos, to: pos }

    let context = syntaxTree(state).resolveInner(pos)
    let before = context.childBefore(pos),
        after = context.childAfter(pos),
        closedBy
    if (
        before &&
        after &&
        before.to <= pos &&
        after.from >= pos &&
        (closedBy = before.type.prop(NodeProp.closedBy)) &&
        closedBy.indexOf(after.name) > -1 &&
        state.doc.lineAt(before.to).from == state.doc.lineAt(after.from).from
    )
        return { from: before.to, to: after.from }
    return null
}

let has_missing_end_block = (node) => {
    /** @type {TreeCursor} */
    let cursor = node.cursor

    while (cursor.parent()) {
        // Currently only searches through other begin and let blocks...
        // TODO should also search through other end-ending blocks
        // @ts-ignore
        if (cursor.name === "CompoundExpression" || cursor.name === "LetStatement") {
            if (cursor.lastChild()) {
                // @ts-ignore
                if (cursor.name === "⚠") {
                    return true
                }
                cursor.parent()
            }
        }
    }
    return false
}

/**
 * @param {EditorState} state
 * @param {number} pos
 */
let is_at_block_start = (state, pos) => {
    // Can't use Nodeprop.closedBy yet, as the way it's used in @lezer/julia is a bit weird
    // Also for now we only check begin/end blocks, slowly expanding to other blocks,
    // but a lot of blocks also can have other ways to continue, like \else, \elseif, etc.

    let node = syntaxTree(state).resolve(pos, -1)
    if (node.name === "CompoundExpression") {
        node = node.firstChild // "begin"
        if (node.to !== pos) return false
    }
    if (node.name === "begin") {
        return has_missing_end_block(node)
    }

    if (node.name === "LetStatement") {
        node = node.firstChild // "let"
        if (node.to !== pos) return false
    }
    if (node.name === "let") {
        return has_missing_end_block(node)
    }

    if (node.name === "ArgumentList" && node.to === pos) {
        let parent = node.parent
        if (parent.name === "FunctionDefinition") {
            if (parent.lastChild.name === "⚠") {
                return true
            }
        }
        return false
    }
}

/**
 * Adapted from https://github.com/codemirror/commands/blob/ad908aaf12c84798a6e6dab5d0d770437abe5a40/src/commands.ts#L604
 * Differences:
 * - Use our own "isBetweenBrackets" that recognizes """
 * - Doesn't use IndentContext(simulateBreak), instead creates a totally new state with the break
 * - Adds `end` when you are on an "unmatched" begin/function/let
 *  - And, the reason that this needs a separate function: It puts that `end` on a new history stack, so when you ctrl+z it first just removes the `end`
 *
 * Also I have no idea what `atEof` really means 🤷‍♀️
 * @returns {import("../../imports/CodemirrorPlutoSetup.js").StateCommand}
 */
function newlineAndIndentWithPossiblyBlocks(atEof) {
    return ({ state, dispatch }) => {
        if (state.readOnly) return false
        let range = state.selection.main
        let { from, to } = range,
            line = state.doc.lineAt(from)
        let explode = !atEof && from == to && isBetweenBrackets(state, from)
        // Check with our very own "is_at_block_start" 🤩
        let insert_block_end = ENABLE_AUTOMATIC_END_INSERTION && !atEof && from == to && is_at_block_start(state, from)
        if (atEof) from = to = (to <= line.to ? line : state.doc.lineAt(to)).to

        // Different than original: actually create a new state with the necessary break inserted
        let tr = state.update({
            changes: { from: from, to: from, insert: !!explode || insert_block_end ? "\n\n" : "\n" },
        })
        let cx = new IndentContext(tr.state)

        let indent = getIndentation(cx, from)
        if (indent == null) indent = /^\s*/.exec(state.doc.lineAt(from).text)[0].length

        while (to < line.to && /\s/.test(line.text[to - line.from])) to++
        if (explode) ({ from, to } = explode)
        // Removed this line: It cleared the last line from any spaces https://github.com/fonsp/Pluto.jl/issues/1515
        // else if (from > line.from && from < line.from + 100 && !/\S/.test(line.text.slice(0, from))) from = line.from
        let insert = ["", indentString(state, indent)]
        if (explode) insert.push(indentString(state, cx.lineIndent(line.from, -1)))

        dispatch(state.update(changes, { scrollIntoView: true, userEvent: "input" }))

        // Add one more line (like `explode`) and `end`
        if (insert_block_end) {
            insert.push(indentString(state, cx.lineIndent(line.from, -1)) + "end")
        }
        // return { changes: { from, to, insert: Text.of(insert) }, range: EditorSelection.cursor(from + 1 + insert[1].length) }
        dispatch(state.update(changes, { scrollIntoView: true, userEvent: "input" }))
    }
}

/**
 * Adapted from https://github.com/codemirror/commands/blob/ad908aaf12c84798a6e6dab5d0d770437abe5a40/src/commands.ts#L604
 * Differences:
 * - Calls `newlineAndIndentWithPossiblyBlocks` when there is just one cursor
 * Also I have no idea what `atEof` really means 🤷‍♀️
 * @returns {import("../../imports/CodemirrorPlutoSetup.js").StateCommand}
 */
export function newlineAndIndent(atEof) {
    let idknewlineAndIndentWithPossiblyBlocks = newlineAndIndentWithPossiblyBlocks(atEof)
    return ({ state, dispatch }) => {
        if (state.readOnly) return false

        if (state.selection.ranges.length === 1 && state.selection.main.empty) {
            return idknewlineAndIndentWithPossiblyBlocks({ state, dispatch })
        }

        let changes = state.changeByRange((range) => {
            let { from, to } = range,
                line = state.doc.lineAt(from)
            let explode = !atEof && from == to && isBetweenBrackets(state, from)
            if (atEof) from = to = (to <= line.to ? line : state.doc.lineAt(to)).to
            let cx = new IndentContext(state, { simulateBreak: from, simulateDoubleBreak: !!explode })
            let indent = getIndentation(cx, from)
            if (indent == null) indent = /^\s*/.exec(state.doc.lineAt(from).text)[0].length

            while (to < line.to && /\s/.test(line.text[to - line.from])) to++
            if (explode) ({ from, to } = explode)
            // This line is different from the original: It normally clears the last line from any spaces, but we keep them!
            // else if (from > line.from && from < line.from + 100 && !/\S/.test(line.text.slice(0, from))) from = line.from
            let insert = ["", indentString(state, indent)]
            if (explode) insert.push(indentString(state, cx.lineIndent(line.from, -1)))
            return { changes: { from, to, insert: Text.of(insert) }, range: EditorSelection.cursor(from + 1 + insert[1].length) }
        })
        dispatch(state.update(changes, { scrollIntoView: true, userEvent: "input" }))
        return true
    }
}
