// Svelte Store system to replace Preact Context
import { writable, derived } from "svelte/store"

// Core application state stores
export const plutoActions = writable(/** @type {Record<string, Function>} */ ({}))
export const plutoBonds = writable(/** @type {import("../components/Editor.js").BondValuesDict} */ ({}))
export const plutoJSInitializing = writable(/** @type {SetWithEmptyCallback<HTMLElement>} */ (null))

// UI state stores
export const isLoading = writable(true)
export const notebookTitle = writable("Untitled Notebook")
export const selectedCell = writable(null)
export const cells = writable([])

// Connection state stores
export const connectionStatus = writable("disconnected") // 'disconnected', 'connecting', 'connected'
export const lastSyncTime = writable(null)

// User preferences stores
export const theme = writable("light") // 'light', 'dark'
export const fontSize = writable(14)
export const showLineNumbers = writable(true)

// Computed stores
export const hasUnsavedChanges = derived(cells, ($cells) => {
    return $cells.some((cell) => cell.hasUnsavedChanges)
})

export const totalCells = derived(cells, ($cells) => $cells.length)

export const runningCells = derived(cells, ($cells) => {
    return $cells.filter((cell) => cell.status === "running").length
})

// Helper functions
export function updateCell(cellId, updates) {
    cells.update(($cells) => {
        const index = $cells.findIndex((cell) => cell.id === cellId)
        if (index !== -1) {
            $cells[index] = { ...$cells[index], ...updates }
        }
        return $cells
    })
}

export function addCell(cellData, index = -1) {
    cells.update(($cells) => {
        if (index === -1) {
            return [...$cells, cellData]
        } else {
            return [...$cells.slice(0, index), cellData, ...$cells.slice(index)]
        }
    })
}

export function removeCell(cellId) {
    cells.update(($cells) => $cells.filter((cell) => cell.id !== cellId))
}

// SetWithEmptyCallback class (copied from original)
export class SetWithEmptyCallback extends Set {
    /**
     * @param {() => void} callback
     */
    constructor(callback) {
        super()
        this.callback = callback
    }

    /**
     * @param {T} value
     */
    delete(value) {
        let result = super.delete(value)
        if (result && this.size === 0) {
            this.callback()
        }
        return result
    }
}
