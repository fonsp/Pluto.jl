/**
 * @fileoverview Main entry point for the Pluto Notebook API package
 *
 * This package provides a TypeScript/JavaScript API for programmatically
 * interacting with Pluto notebooks without requiring the full Editor UI.
 */
export { Pluto, PlutoNotebook } from './PlutoNotebookAPI.js';
export { default as parseNotebook, serializeNotebook } from './NotebookParser.js';
export type { NotebookData, CellInputData, CellResultData, CellMetaData, CellDependencyData, CellDependencyGraph, NotebookPkgData, BondValueContainer, BondValuesDict, LogEntryData, StatusEntryData, CellData, } from './types.js';
import type { NotebookData } from './types.js';
export interface UpdateEvent {
    type: string;
    data: any;
    timestamp: number;
    notebook?: NotebookData;
}
export interface ConnectionStatusEvent {
    connected: boolean;
    hopeless: boolean;
    timestamp: number;
}
export { DEFAULT_CELL_METADATA, PTOML_CELL_ID, MTOML_CELL_ID } from './NotebookParser.js';
