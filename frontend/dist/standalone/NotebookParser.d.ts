/**
 * Parse a Pluto notebook file content and return NotebookData structure
 * @param {string} content - The raw content of the .jl notebook file
 * @param {string} [path=""] - The file path for the notebook
 * @returns {Object} NotebookData structure compatible with Pluto frontend
 */
declare function parseNotebook(content: string, path?: string): any;
/**
 * Serialize NotebookData back to Pluto notebook file format
 * @param {Object} notebookData - NotebookData structure
 * @returns {string} Notebook file content
 */
export function serializeNotebook(notebookData: any): string;
export namespace DEFAULT_CELL_METADATA {
    let disabled: boolean;
    let show_logs: boolean;
    let skip_as_script: boolean;
}
export const PTOML_CELL_ID: "00000000-0000-0000-0000-000000000001";
export const MTOML_CELL_ID: "00000000-0000-0000-0000-000000000002";
export { parseNotebook as default };
