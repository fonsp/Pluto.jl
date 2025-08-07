/**
 * @fileoverview Type definitions for the Pluto Notebook API package
 */

// Import notebook data type
import { NotebookData } from "../components/Editor.js"

// Export main API classes
export { Host, Worker } from "./client.js"

// Export notebook parser functions
export { default as parse, serialize } from "./parser.js"

// Export utility constants
export { DEFAULT_CELL_METADATA, PTOML_CELL_ID, MTOML_CELL_ID } from "./parser.js"

export type { NotebookData, CellDependencyData, CellResultData, CellDependencyGraph, CellInputData, CellMetaData } from "../components/Editor.js"
export type { PlutoConnection, WebsocketConnection } from "../common/PlutoConnection.js"

// Type for update events
export interface UpdateEvent {
    type: string
    data: any
    timestamp: number
    notebook?: NotebookData
}

// Type for connection status events
export interface ConnectionStatusEvent {
    connected: boolean
    hopeless: boolean
    timestamp: number
}
