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
    constructor(server_url?: string);
    /** @type {string} */
    server_url: string;
    /** @type {string} */
    ws_address: string;
    /** @type {Map<string, PlutoNotebook>} */
    _notebooks: Map<string, PlutoNotebook>;
    /**
     * Get list of currently running notebooks on the server
     * @returns {Promise<Array<PlutoNotebook>>} Array of notebook information objects
     * @throws {Error} If connection to server fails
     */
    getRunningNotebooks(): Promise<Array<PlutoNotebook>>;
    /**
     * Get or create a PlutoNotebook instance for the given notebook ID
     *
     * This method implements a cache pattern - multiple calls with the same
     * notebook_id will return the same PlutoNotebook instance.
     *
     * @param {string} notebook_id - Notebook UUID
     * @returns {PlutoNotebook} PlutoNotebook instance (may be cached)
     */
    notebook(notebook_id: string): PlutoNotebook;
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
    createNotebook(notebook_text: string): Promise<PlutoNotebook>;
    /**
     * Remove a notebook instance from memory
     *
     * This is called internally when a notebook is shut down.
     * You typically don't need to call this manually.
     *
     * @param {string} notebook_id - Notebook UUID
     * @private
     */
    private _removeNotebook;
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
    constructor(ws_address: string, notebook_id: string);
    /** @type {string} */
    ws_address: string;
    /** @type {string} */
    notebook_id: string;
    /** @type {boolean} */
    connected: boolean;
    /** @type {boolean} */
    initializing: boolean;
    /** @type {*} */
    notebook_status: any;
    /** @type {Record<string, import("../components/Editor.js").CellInputData>} */
    cell_inputs_local: Record<string, import("../components/Editor.js").CellInputData>;
    /** @type {import("../components/Editor.js").NotebookData*/
    notebook_state: import("../components/Editor.js").NotebookData;
    /** @type {number} */
    last_update_time: number;
    /** @type {number} */
    pending_local_updates: number;
    /** @type {number} */
    last_update_counter: number;
    /** @type {import("../common/PlutoConnection.js").PlutoConnection | null} */
    client: import("../common/PlutoConnection.js").PlutoConnection | null;
    /** @type {Set<Function>} */
    _update_handlers: Set<Function>;
    /** @type {Set<Function>} */
    _connection_status_handlers: Set<Function>;
    /** @type {Promise<void>} */
    _update_queue_promise: Promise<void>;
    /**
     * Connect to the Pluto backend WebSocket for this notebook
     *
     * This method establishes the WebSocket connection, initializes the notebook
     * state, and syncs with the server. Must be called before other operations.
     *
     * @returns {Promise<boolean>} True if connection and initialization successful
     * @throws {Error} If connection fails or notebook doesn't exist
     */
    connect(): Promise<boolean>;
    /**
     * Close the connection to this notebook
     */
    close(): void;
    /**
     * Shutdown the running notebook on the server
     *
     * This terminates the notebook process and removes it from the server.
     * After shutdown, the notebook instance becomes unusable and should be discarded.
     *
     * @returns {Promise<boolean>} True if shutdown successful
     * @throws {Error} If not connected to notebook
     */
    shutdown(): Promise<boolean>;
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
    restart(maybe_confirm?: boolean): Promise<void>;
    /**
     * Execute a function within the Julia context
     *
     * @param {string} symbol - Function symbol to execute
     * @param {Array<any>} [arguments=[]] - Arguments to pass to the function
     * @returns {Promise<any>} Function result
     * @throws {Error} Not implemented
     */
    execute(input: any): Promise<any>;
    /**
     * Get the current notebook state (equivalent to Editor.js this.state.notebook)
     *
     * Returns the complete notebook state structure including cell_inputs,
     * cell_results, cell_order, and metadata. This matches the structure
     * used by Editor.js.
     *
     * @returns {NotebookData|null} Current notebook state, or null if not connected
     */
    getNotebookState(): NotebookData | null;
    /**
     * Get specific cell data
     *
     * @param {string} cell_id - Cell UUID
     * @returns {CellData|null} Cell data object with input, result, and local state
     */
    getCell(cell_id: string): CellData | null;
    /**
     * Get all cells in order
     *
     * Returns cells in the order specified by cell_order, with complete
     * input and result data for each cell.
     *
     * @returns {Array<{cell_id: string} & CellData>} Array of cell data objects in execution order
     */
    getCells(): Array<{
        cell_id: string;
    } & CellData>;
    /**
     * Update cell code and optionally run it
     *
     * This updates the cell's code and optionally triggers execution.
     * The change is first stored locally, then sent to the server.
     *
     * @param {string} cell_id - Cell UUID
     * @param {string} code - New cell code
     * @param {boolean} [run=true] - Whether to run the cell after updating
     * @param {Object} [metadata={}] - Additional cell metadata
     * @returns {Promise<Object|undefined>} Response from backend if run=true
     * @throws {Error} If not connected to notebook
     */
    updateCellCode(cell_id: string, code: string, run?: boolean, metadata?: any): Promise<any | undefined>;
    /**
     * Submit local cell changes to backend and run cells
     * @param {Array<string>} cell_ids - Array of cell UUIDs to update and run
     * @param {Record<string, Object>} metadata_record - Metadata for each cell
     * @returns {Promise<Object>} - Response from backend
     */
    setCellsAndRun(cell_ids: Array<string>, metadata_record: Record<string, any>): Promise<any>;
    /**
     * Add a new cell to the notebook
     *
     * Creates a new cell with a generated UUID, inserts it at the specified
     * position, and immediately runs it. The cell is added to both cell_inputs
     * and cell_results with appropriate initial state.
     *
     * @param {number} [index=0] - Position to insert the cell (0-based)
     * @param {string} [code=""] - Initial cell code
     * @param {Object} [metadata={}] - Additional cell metadata
     * @returns {Promise<CellId>} UUID of the newly created cell
     * @throws {Error} If not connected to notebook
     *
     * @example
     * const cellId = await notebook.addCell(0, "println(\"Hello World\")");
     */
    addCell(index?: number, code?: string, metadata?: any): Promise<CellId>;
    /**
     * Delete cells from the notebook
     * @param {Array<string>} cell_ids - Array of cell UUIDs to delete
     * @returns {Promise<void>}
     */
    deleteCells(cell_ids: Array<string>): Promise<void>;
    /**
     * Interrupt notebook execution
     * @returns {Promise<void>}
     */
    interrupt(): Promise<void>;
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
    onUpdate(callback: (arg0: UpdateEvent) => void): () => void;
    /**
     * Register a handler for connection status changes
     * @param {Function} handler - Function to call on connection status changes
     * @returns {function(): void} Unsubscribe function
     */
    onConnectionStatus(handler: Function): () => void;
    /**
     * Check if notebook is currently idle (not running any cells)
     *
     * A notebook is considered idle when:
     * - No local updates are pending
     * - No cells are currently running or queued
     *
     * @returns {boolean} True if notebook is idle
     */
    isIdle(): boolean;
    /**
     * Handle update from WebSocket
     * @param {Object} update - Update object from server
     * @param {boolean} by_me - Whether update was triggered by this client
     * @private
     */
    private _handle_update;
    /**
     * Handle notebook diff message
     * @param {Object} message - Notebook diff message
     * @private
     */
    private _handle_notebook_diff;
    /**
     * Apply patches to notebook state
     * @param {Array} patches - Array of patches to apply
     * @private
     */
    private _apply_patches;
    /**
     * Handle connection status change
     * @param {boolean} connected - Whether connection is active
     * @param {boolean} hopeless - Whether connection is hopeless
     * @private
     */
    private _handle_connection_status;
    /**
     * Handle reconnect event
     * @returns {Promise<boolean>} Whether reconnect was successful
     * @private
     */
    private _handle_reconnect;
    /**
     * Update notebook state using a mutate function
     * @param {Function} mutate_fn - Function to mutate the notebook state
     * @returns {Promise<void>}
     * @private
     */
    private _update_notebook_state;
    /**
     * Notify update handlers
     * @param {string} event_type - Type of event
     * @param {*} data - Event data
     * @private
     */
    private _notify_update;
    /**
     * Notify connection status handlers
     * @param {boolean} connected - Whether connection is active
     * @param {boolean} hopeless - Whether connection is hopeless
     * @private
     */
    private _notify_connection_status_change;
}
export type CellData = {
    input: import("../components/Editor.js").CellInputData;
    results: import("../components/Editor.js").CellResultData;
};
