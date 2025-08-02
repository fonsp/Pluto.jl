/**
 * @fileoverview PlutoNotebookAPI - Programmatic Interface for Pluto Notebooks
 *
 * This module provides a JavaScript API for interacting with Pluto notebooks
 * without requiring the full Editor UI. It's designed for:
 *
 * - Automated notebook execution
 * - Testing and CI/CD pipelines
 * - Custom notebook interfaces
 * - Headless Pluto workflows
 *
 * The API maintains compatibility with Pluto's internal state structures
 * and uses the same WebSocket protocol as the Editor.js component.
 *
 * ## Basic Usage
 *
 * ```javascript
 * import { Pluto } from './PlutoNotebookAPI.js';
 *
 * // Connect to Pluto server
 * const pluto = new Pluto("http://localhost:1234");
 *
 * // Create a new notebook
 * const notebook = await pluto.createNotebook("x = 1 + 1");
 *
 * // Add and run cells
 * const cellId = await notebook.addCell(0, "println(x)");
 *
 * // Listen for updates
 * notebook.onUpdate((event) => {
 *   console.log("Update:", event.type, event.data);
 * });
 * ```
 *
 * ## State Compatibility
 *
 * The notebook state structure matches Editor.js exactly:
 * - `notebook_state.cell_order` - Array of cell IDs in execution order
 * - `notebook_state.cell_inputs` - Map of cell IDs to input data
 * - `notebook_state.cell_results` - Map of cell IDs to execution results
 * - `notebook_state.status_tree` - Execution status hierarchy
 *
 * @author Pluto.jl Team
 * @version 1.0.0
 */

import { create_pluto_connection, ws_address_from_base } from "https://cdn.jsdelivr.net/gh/fonsp/Pluto.jl@main/frontend/common/PlutoConnection.js"
import { empty_notebook_state } from "https://cdn.jsdelivr.net/gh/fonsp/Pluto.jl@main/frontend/editor.js"
import { applyPatches, produceWithPatches } from "https://cdn.jsdelivr.net/gh/fonsp/Pluto.jl@main/frontend/imports/immer.js"

// Be sure to keep this in sync with DEFAULT_CELL_METADATA in Cell.jl
const DEFAULT_CELL_METADATA = {
    disabled: false,
    show_logs: true,
    skip_as_script: false,
}

// from our friends at https://stackoverflow.com/a/2117523
// i checked it and it generates Julia-legal UUIDs and that's all we need -SNOF
const uuidv4 = () =>
    //@ts-ignore
    "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16))

/**
 * Pluto - Main class for connecting to a Pluto server and managing notebooks
 *
 * This class provides high-level operations for interacting with a Pluto server:
 * - Discovering running notebooks
 * - Creating new notebooks from text content
 * - Managing PlutoNotebook instances
 *
 * @example
 * const pluto = new Pluto("http://localhost:1234");
 * const notebooks = await pluto.getRunningNotebooks();
 * const notebook = await pluto.createNotebook(``);
 */
export class Pluto {
    /**
     * Create a new Pluto instance
     * @param {string} [server_url="http://localhost:1234"] - Pluto server URL
     */
    constructor(server_url = "http://localhost:1234") {
        this.server_url = server_url
        this.ws_address = ws_address_from_base(server_url)
        this._notebooks = new Map()
    }

    /**
     * Get list of currently running notebooks on the server
     * @returns {Promise<Array<any>>} Array of notebook information objects
     * @throws {Error} If connection to server fails
     */
    async getRunningNotebooks() {
        try {
            // Create a temporary connection to get server info
            const temp_client = await create_pluto_connection({
                ws_address: this.ws_address,
                on_unrequested_update: () => {},
                on_connection_status: () => {},
                on_reconnect: async () => true,
            })

            // Request server status to get running notebooks
            const response = await temp_client.send("get_all_notebooks", {}, {}, false)
            temp_client.kill()

            return response.message?.notebooks || []
        } catch (error) {
            console.error("Failed to get running notebooks:", error)
            return []
        }
    }

    /**
     * Get or create a PlutoNotebook instance for the given notebook ID
     *
     * This method implements a cache pattern - multiple calls with the same
     * notebook_id will return the same PlutoNotebook instance.
     *
     * @param {string} notebook_id - Notebook UUID
     * @returns {PlutoNotebook} PlutoNotebook instance (may be cached)
     */
    notebook(notebook_id) {
        if (!this._notebooks.has(notebook_id)) {
            this._notebooks.set(notebook_id, new PlutoNotebook(this.ws_address, notebook_id))
        }
        return this._notebooks.get(notebook_id)
    }

    /**
     * Create a new notebook from text content
     *
     * This method uploads notebook content to the server via /notebookupload,
     * creates a PlutoNotebook instance, connects to it, and restarts it for
     * proper initialization.
     *
     * @param {string} notebook_text - Pluto notebook text content (.jl format)
     * @returns {Promise<PlutoNotebook>} Connected and initialized PlutoNotebook instance
     * @throws {Error} If upload fails, connection fails, or restart fails
     *
     * @example
     * const notebook = await pluto.createNotebook(`
     *   ### A Pluto.jl notebook ###
     *   # v0.19.40
     *
     *   x = 1 + 1
     * `);
     */
    async createNotebook(notebook_text) {
        try {
            // Upload notebook text to server using /notebookupload endpoint
            const response = await fetch(`${this.server_url}/notebookupload`, {
                method: "POST",
                body: notebook_text,
            })

            if (!response.ok) {
                throw new Error(`Failed to upload notebook: ${response.status} ${response.statusText}`)
            }

            // Get the notebook ID from the response
            const notebook_id = await response.text()

            // Create and connect to the new notebook
            const notebook = this.notebook(notebook_id)
            const connected = await notebook.connect()

            if (!connected) {
                throw new Error("Failed to connect to newly created notebook")
            }

            // Restart the notebook to ensure proper initialization
            await notebook.restart()

            return notebook
        } catch (error) {
            console.error("Failed to create notebook:", error)
            throw error
        }
    }

    /**
     * Remove a notebook instance from memory
     *
     * This is called internally when a notebook is shut down.
     * You typically don't need to call this manually.
     *
     * @param {string} notebook_id - Notebook UUID
     * @private
     */
    _removeNotebook(notebook_id) {
        this._notebooks.delete(notebook_id)
    }
}

/**
 * PlutoNotebook - A programmatic interface to interact with a specific Pluto notebook
 * without the full Editor UI component.
 *
 * This class provides the core functionality of the Editor.js component:
 * 1. Connection management to Pluto backend via WebSocket
 * 2. Notebook state management (mirroring Editor.js state structure)
 * 3. Cell code updates and execution
 * 4. Real-time state synchronization
 *
 * The state management is designed to be compatible with Editor.js:
 * - Uses the same notebook state structure
 * - Handles patches the same way
 * - Maintains the same cell lifecycle
 *
 * @example
 * const notebook = pluto.notebook("notebook-uuid");
 * await notebook.connect();
 *
 * // Add and run a cell
 * const cellId = await notebook.addCell(0, "x = 1 + 1");
 *
 * // Update cell code
 * await notebook.updateCellCode(cellId, "x = 2 + 2");
 *
 * // Listen for updates
 * const unsubscribe = notebook.onUpdate((event) => {
 *   console.log("Notebook updated:", event);
 * });
 */
export class PlutoNotebook {
    /**
     * Create a new PlutoNotebook instance
     *
     * Note: This constructor only creates the instance. You must call connect()
     * to establish the WebSocket connection and initialize the notebook state.
     *
     * @param {string} ws_address - WebSocket address to connect to
     * @param {string} notebook_id - Specific notebook ID to connect to
     */
    constructor(ws_address, notebook_id) {
        this.ws_address = ws_address
        this.notebook_id = notebook_id
        this.connected = false
        this.initializing = true

        // Initialize notebook state
        this.notebook_state = null
        this.cell_inputs_local = {}
        this.last_update_time = 0

        // Connection state
        this.client = null
        this.pending_local_updates = 0
        this.last_update_counter = -1

        // Event handlers
        this._update_handlers = new Set()
        this._connection_status_handlers = new Set()

        // Initialize update queue for batched operations
        this._update_queue_promise = Promise.resolve()
    }

    /**
     * Connect to the Pluto backend WebSocket for this notebook
     *
     * This method establishes the WebSocket connection, initializes the notebook
     * state, and syncs with the server. Must be called before other operations.
     *
     * @returns {Promise<boolean>} True if connection and initialization successful
     * @throws {Error} If connection fails or notebook doesn't exist
     */
    async connect() {
        if (this.connected) {
            return true
        }

        try {
            this.client = await create_pluto_connection({
                ws_address: this.ws_address,
                on_unrequested_update: this._handle_update.bind(this),
                on_connection_status: this._handle_connection_status.bind(this),
                on_reconnect: this._handle_reconnect.bind(this),
                connect_metadata: { notebook_id: this.notebook_id },
            })

            // Initialize notebook state
            if (this.client.notebook_exists) {
                this.notebook_state = empty_notebook_state({
                    notebook_id: this.notebook_id,
                })

                // Ensure required structures exist for patches
                if (!this.notebook_state.cell_results) {
                    this.notebook_state.cell_results = {}
                }
                if (!this.notebook_state.status_tree) {
                    this.notebook_state.status_tree = { subtasks: {} }
                }
            }

            if (!this.client.notebook_exists) {
                console.error("Notebook does not exist. Not connecting.")
                return false
            }

            // Send initial update_notebook request to sync state
            console.debug("Sending update_notebook request...")
            const response = await this.client.send("update_notebook", { updates: [] }, { notebook_id: this.notebook_id }, false)
            console.debug({ response })
            console.debug("Received update_notebook request")

            this.initializing = false

            return true
        } catch (error) {
            console.error("Failed to connect to Pluto backend:", error)
            return false
        }
    }

    /**
     * Close the connection to this notebook
     */
    close() {
        if (this.client && this.client.kill) {
            this.client.kill()
        }
        this.connected = false
        this.client = null
        this.notebook_state = null
        this._update_handlers.clear()
        this._connection_status_handlers.clear()
    }

    /**
     * Shutdown the running notebook on the server
     *
     * This terminates the notebook process and removes it from the server.
     * After shutdown, the notebook instance becomes unusable and should be discarded.
     *
     * @returns {Promise<boolean>} True if shutdown successful
     * @throws {Error} If not connected to notebook
     */
    async shutdown() {
        if (!this.client) {
            throw new Error("Not connected to notebook")
        }

        try {
            // Send shutdown command to the server
            await this.client.send("shutdown_notebook", {}, { notebook_id: this.notebook_id }, false)

            // Close the local connection
            this.close()

            return true
        } catch (error) {
            console.error("Failed to shutdown notebook:", error)
            return false
        }
    }

    /**
     * Restart the notebook process
     *
     * This clears risky file metadata and sends a restart_process command to the server.
     * All cell execution state is reset, but cell code is preserved.
     *
     * @param {boolean} [maybe_confirm=false] - Whether to require confirmation for risky files (unused in API context)
     * @returns {Promise<void>}
     * @throws {Error} If not connected to notebook or restart fails
     */
    async restart(maybe_confirm = false) {
        if (!this.client || !this.notebook_state) {
            throw new Error("Not connected to notebook")
        }

        try {
            // Clear risky file metadata if present
            await this._update_notebook_state((nb) => {
                if (nb.metadata?.risky_file_source) {
                    delete nb.metadata.risky_file_source
                }
            })

            // Send restart command to server
            // Awaiting this is futile, I think (@pankgeorg, 2/8/2025)
            this.client.send(
                "restart_process",
                {},
                {
                    notebook_id: this.notebook_id,
                }
            )

            this._notify_update("notebook_restarted", {
                notebook_id: this.notebook_id,
            })
        } catch (error) {
            console.error("Failed to restart notebook:", error)
            throw error
        }
    }

    /**
     * Get the current notebook state (equivalent to Editor.js this.state.notebook)
     *
     * Returns the complete notebook state structure including cell_inputs,
     * cell_results, cell_order, and metadata. This matches the structure
     * used by Editor.js.
     *
     * @returns {NotebookState|null} Current notebook state, or null if not connected
     */
    getNotebookState() {
        return this.notebook_state
    }

    /**
     * Get specific cell data
     *
     * @param {string} cell_id - Cell UUID
     * @returns {string|null} Cell data object with input, result, and local state
     */
    getCell(cell_id) {
        if (!this.notebook_state) return null

        return {
            input: this.notebook_state.cell_inputs?.[cell_id],
            result: this.notebook_state.cell_results?.[cell_id],
            local: this.cell_inputs_local[cell_id],
        }
    }

    /**
     * Get all cells in order
     *
     * Returns cells in the order specified by cell_order, with complete
     * input and result data for each cell.
     *
     * @returns {Array<CellData>} Array of cell data objects in execution order
     */
    getCells() {
        if (!this.notebook_state || !this.notebook_state.cell_order) return []

        return this.notebook_state.cell_order.map((cell_id) => ({
            cell_id,
            ...this.getCell(cell_id),
        }))
    }

    /**
     * Update cell code and optionally run it
     *
     * This updates the cell's code and optionally triggers execution.
     * The change is first stored locally, then sent to the server.
     *
     * @param {CellId} cell_id - Cell UUID
     * @param {string} code - New cell code
     * @param {boolean} [run=true] - Whether to run the cell after updating
     * @returns {Promise<Object|undefined>} Response from backend if run=true
     * @throws {Error} If not connected to notebook
     */
    async updateCellCode(cell_id, code, run = true, metadata = {}) {
        if (!this.client || !this.notebook_state) {
            throw new Error("Not connected to notebook")
        }

        // Update local state
        this.cell_inputs_local[cell_id] = { code }
        this._notify_update("cell_local_update", { cell_id, code })

        if (run) {
            return await this.setCellsAndRun([cell_id], { cell_id: metadata })
        }
    }

    /**
     * Submit local cell changes to backend and run cells
     * @param {Array<string>} cell_ids - Array of cell UUIDs to update and run
     * @returns {Promise<Object>} - Response from backend
     */
    async setCellsAndRun(cell_ids, metadata_record) {
        if (!this.client || !this.notebook_state) {
            throw new Error("Not connected to notebook")
        }

        if (cell_ids.length === 0) {
            return { disabled_cells: {} }
        }

        const new_task = this._update_queue_promise.then(async () => {
            // Create patches for the cell code changes
            const [new_notebook, changes] = produceWithPatches(this.notebook_state, (notebook) => {
                for (let cell_id of cell_ids) {
                    if (this.cell_inputs_local[cell_id]) {
                        // Ensure cell_inputs[cell_id] exists before setting code
                        if (!notebook.cell_inputs[cell_id]) {
                            notebook.cell_inputs[cell_id] = {}
                        }
                        notebook.cell_inputs[cell_id].code = this.cell_inputs_local[cell_id].code
                        notebook.cell_inputs[cell_id].metadata = { ...notebook.cell_inputs[cell_id].metadata, ...metadata_record[cell_id] }
                    }
                }
            })

            if (changes.length === 0) {
                return { disabled_cells: {} }
            }

            this.pending_local_updates++

            try {
                // Send the update to the backend
                const response = await this.client.send("update_notebook", { updates: changes }, { notebook_id: this.notebook_id }, false)

                if (response.message?.response?.update_went_well === "👎") {
                    throw new Error(`Pluto update_notebook error: (from Julia: ${response.message.response.why_not})`)
                }

                // Update local state
                this.notebook_state = new_notebook
                this.last_update_time = Date.now()

                // Clear local changes for updated cells
                for (let cell_id of cell_ids) {
                    delete this.cell_inputs_local[cell_id]
                }

                // Run the cells
                const run_response = await this.client.send("run_multiple_cells", { cells: cell_ids }, { notebook_id: this.notebook_id })

                this._notify_update("cells_updated", {
                    cell_ids,
                    response: run_response,
                })

                return run_response.message
            } finally {
                this.pending_local_updates--
            }
        })

        this._update_queue_promise = new_task.catch(console.error)
        return await new_task
    }

    /**
     * Add a new cell to the notebook
     *
     * Creates a new cell with a generated UUID, inserts it at the specified
     * position, and immediately runs it. The cell is added to both cell_inputs
     * and cell_results with appropriate initial state.
     *
     * @param {number} [index=0] - Position to insert the cell (0-based)
     * @param {string} [code=""] - Initial cell code
     * @returns {Promise<CellId>} UUID of the newly created cell
     * @throws {Error} If not connected to notebook
     *
     * @example
     * const cellId = await notebook.addCell(0, "println(\"Hello World\")");
     */
    async addCell(index = 0, code = "", metadata = {}) {
        if (!this.client || !this.notebook_state) {
            throw new Error("Not connected to notebook")
        }

        const cell_id = uuidv4()
        await this._update_notebook_state((notebook) => {
            notebook.cell_inputs[cell_id] = {
                cell_id: cell_id,
                code,
                code_folded: false,
                metadata: { ...DEFAULT_CELL_METADATA, ...metadata },
            }

            // Add to cell_order
            notebook.cell_order = [...notebook.cell_order.slice(0, index), cell_id, ...notebook.cell_order.slice(index, Infinity)]
        })

        // Wait for the server to confirm the cell addition
        await this.client.send("run_multiple_cells", { cells: [cell_id] }, { notebook_id: this.notebook_id })

        // Update local state to match server response
        // this.notebook_state = new_notebook;

        this._notify_update("cell_added", { cell_id, index })

        return cell_id
    }

    /**
     * Delete cells from the notebook
     * @param {Array<string>} cell_ids - Array of cell UUIDs to delete
     * @returns {Promise<void>}
     */
    async deleteCells(cell_ids) {
        if (!this.client || !this.notebook_state) {
            throw new Error("Not connected to notebook")
        }

        await this._update_notebook_state((notebook) => {
            for (let cell_id of cell_ids) {
                delete notebook.cell_inputs[cell_id]
            }
            notebook.cell_order = notebook.cell_order.filter((cell_id) => !cell_ids.includes(cell_id))
        })

        // Clear local state for deleted cells
        for (let cell_id of cell_ids) {
            delete this.cell_inputs_local[cell_id]
        }

        // Run empty cells array to trigger dependency updates
        await this.client.send("run_multiple_cells", { cells: [] }, { notebook_id: this.notebook_id })

        this._notify_update("cells_deleted", { cell_ids })
    }

    /**
     * Interrupt notebook execution
     */
    async interrupt() {
        if (!this.client) {
            throw new Error("Not connected to notebook")
        }

        await this.client.send("interrupt_all", {}, { notebook_id: this.notebook_id }, false)
    }

    /**
     * Register a callback for updates from the WebSocket
     *
     * This callback will be called every time a state update comes from the websocket.
     * Use this to react to cell execution results, notebook state changes, etc.
     *
     * @param {function(UpdateEvent): void} callback - Function to call on updates
     * @returns {function(): void} Unsubscribe function to stop receiving updates
     *
     * @example
     * const unsubscribe = notebook.onUpdate((event) => {
     *   if (event.type === 'notebook_updated') {
     *     console.log('Notebook state changed');
     *   }
     * });
     *
     * // Later, stop listening
     * unsubscribe();
     */
    onUpdate(callback) {
        this._update_handlers.add(callback)
        return () => this._update_handlers.delete(callback)
    }

    /**
     * Register a handler for connection status changes
     * @param {Function} handler - Function to call on connection status changes
     */
    onConnectionStatus(handler) {
        this._connection_status_handlers.add(handler)
        return () => this._connection_status_handlers.delete(handler)
    }

    /**
     * Check if notebook is currently idle (not running any cells)
     *
     * A notebook is considered idle when:
     * - No local updates are pending
     * - No cells are currently running or queued
     *
     * @returns {boolean} True if notebook is idle
     */
    isIdle() {
        if (!this.notebook_state) return true

        return !(this.pending_local_updates > 0 || Object.values(this.notebook_state.cell_results).some((cell) => cell.running || cell.queued))
    }

    // Private methods

    _handle_update(update, by_me) {
        if (this.notebook_state?.notebook_id === update.notebook_id) {
            const message = update.message
            switch (update.type) {
                case "notebook_diff":
                    this._handle_notebook_diff(message)
                    break
                default:
                    console.warn("Received unknown update type!", update)
                    break
            }
        }
    }

    _handle_notebook_diff(message) {
        if (message?.counter != null) {
            if (message.counter <= this.last_update_counter) {
                console.error("State update out of order", message.counter, this.last_update_counter)
                return
            }
            this.last_update_counter = message.counter
        }

        if (message.patches && message.patches.length > 0) {
            this._apply_patches(message.patches)
        }
    }

    _apply_patches(patches) {
        try {
            // Ensure we have a valid notebook state before applying patches
            if (!this.notebook_state) {
                console.warn("No notebook state available, skipping patch application")
                return
            }

            // Validate patches before applying
            if (!Array.isArray(patches) || patches.length === 0) {
                console.warn("Invalid or empty patches, skipping application")
                return
            }

            let new_notebook = applyPatches(this.notebook_state, patches)

            this.notebook_state = new_notebook
            this.last_update_time = Date.now()

            this._notify_update("notebook_updated", {
                patches,
                notebook: new_notebook,
            })
        } catch (exception) {
            console.error("Failed to apply patches:", exception)
            console.error("Notebook state:", this.notebook_state)
            console.error("Patches:", patches)

            // Request state reset from server
            if (this.client && this.connected) {
                console.info("Resetting state")
                this.client.send("reset_shared_state", {}, { notebook_id: this.notebook_id }, false)
            }
        }
    }

    _handle_connection_status(connected, hopeless) {
        this.connected = connected
        this._notify_connection_status_change(connected, hopeless)
    }

    async _handle_reconnect() {
        console.warn("Reconnected! Checking states")

        if (this.client) {
            await this.client.send("reset_shared_state", {}, { notebook_id: this.notebook_id }, false)
        }

        return true
    }

    async _update_notebook_state(mutate_fn) {
        if (!this.notebook_state) return

        const [notebook, changes] = produceWithPatches(this.notebook_state, (notebook) => {
            mutate_fn(notebook)
        })

        if (changes.length === 0) return

        this.pending_local_updates++

        try {
            // The changes to be sent should already exist locally
            // because patches are going to be diffed against that
            this.notebook_state = notebook
            const response = await this.client.send("update_notebook", { updates: changes }, { notebook_id: this.notebook_id }, false)

            if (response.message?.response?.update_went_well === "👎") {
                throw new Error(`Pluto update_notebook error: (from Julia: ${response.message.response.why_not})`)
            }
            this.last_update_time = Date.now()
            console.log({ state: notebook })
        } finally {
            this.pending_local_updates--
        }
    }

    _notify_update(event_type, data) {
        this._update_handlers.forEach((handler) => {
            try {
                handler({ type: event_type, data, timestamp: Date.now(), notebook: this.notebook_state })
            } catch (error) {
                console.error("Error in update handler:", error)
            }
        })
    }

    _notify_connection_status_change(connected, hopeless) {
        this._connection_status_handlers.forEach((handler) => {
            try {
                handler({ connected, hopeless, timestamp: Date.now() })
            } catch (error) {
                console.error("Error in connection status handler:", error)
            }
        })
    }
}
