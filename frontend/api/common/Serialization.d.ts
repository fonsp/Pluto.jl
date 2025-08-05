/**
 * Serialize an array of cells into a string form (similar to the .jl file).
 *
 * Used for implementing clipboard functionality. This isn't in topological
 * order, so you won't necessarily be able to run it directly.
 *
 * @param {Array<import("../components/Editor.js").CellInputData>} cells
 * @return {String}
 */
export function serialize_cells(cells: Array<import("../components/Editor.js").CellInputData>): string;
/**
 * Deserialize a Julia program or output from `serialize_cells`.
 *
 * If a Julia program, it will return a single String containing it. Otherwise,
 * it will split the string into cells based on the special delimiter.
 *
 * @param {String} serialized_cells
 * @return {Array<String>}
 */
export function deserialize_cells(serialized_cells: string): Array<string>;
/**
 * Deserialize a Julia REPL session.
 *
 * It will split the string into cells based on the Julia prompt. Multiple
 * lines are detected based on indentation.
 *
 * @param {String} repl_session
 * @return {Array<String>}
 */
export function deserialize_repl(repl_session: string): Array<string>;
export function detect_deserializer(topaste: string): typeof deserialize_repl;
