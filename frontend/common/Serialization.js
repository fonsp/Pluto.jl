import { in_textarea_or_input } from "./KeyboardShortcuts.js"

/**
 * Serialize an array of cells into a string form (similar to the .jl file).
 *
 * Used for implementing clipboard functionality. This isn't in topological
 * order, so you won't necessarily be able to run it directly.
 *
 * @param {Array<import("../components/Editor.js").CellInputData>} cells
 * @return {String}
 */
export function serialize_cells(cells) {
    return cells.map((cell) => `# ╔═╡ ${cell.cell_id}\n` + cell.code + "\n").join("\n")
}

/**
 * Deserialize a Julia program or output from `serialize_cells`.
 *
 * If a Julia program, it will return a single String containing it. Otherwise,
 * it will split the string into cells based on the special delimiter.
 *
 * @param {String} serialized_cells
 * @return {Array<String>}
 */
export function deserialize_cells(serialized_cells) {
    const segments = serialized_cells.replace(/\r\n/g, "\n").split(/# ╔═╡ \S+\n/)
    return segments.map((s) => s.trim()).filter((s) => s !== "")
}

/**
 * Deserialize a Julia REPL session.
 *
 * It will split the string into cells based on the Julia prompt. Multiple
 * lines are detected based on indentation.
 *
 * @param {String} repl_session
 * @return {Array<String>}
 */
export function deserialize_repl(repl_session) {
    const prompt = "julia> "
    const segments = repl_session.replace(/\r\n/g, "\n").split(prompt)
    const indent = " ".repeat(prompt.length)
    return segments
        .map(function (s) {
            return (indent + s)
                .split("\n")
                .filter((line) => line.startsWith(indent))
                .map((s) => s.replace(indent, ""))
                .join("\n")
        })
        .map((s) => s.trim())
        .filter((s) => s !== "")
}

export const detect_deserializer = (topaste, check_in_textarea_or_input = true) =>
    topaste.match(/^julia> /m) != null
        ? deserialize_repl
        : (check_in_textarea_or_input && !in_textarea_or_input()) || topaste.match(/# ╔═╡ ........-....-....-....-............/g)?.length
        ? deserialize_cells
        : null
