/**
 * @fileoverview Main entry point for the Pluto Notebook API package
 *
 * This package provides a TypeScript/JavaScript API for programmatically
 * interacting with Pluto notebooks without requiring the full Editor UI.
 */

// Export main API classes from PlutoNotebookAPI.js
export { Pluto, PlutoNotebook, type CellData } from "./PlutoNotebookAPI.js"

// Export notebook parser functions
export { default as parseNotebook, serializeNotebook } from "./NotebookParser.js"

// Export utility constants
export { DEFAULT_CELL_METADATA, PTOML_CELL_ID, MTOML_CELL_ID } from "./NotebookParser.js"

export type { NotebookData, CellDependencyData, CellResultData, CellDependencyGraph, CellInputData, CellMetaData } from "../components/Editor.js"
export type { PlutoConnection, WebsocketConnection } from "../common/PlutoConnection.js"
