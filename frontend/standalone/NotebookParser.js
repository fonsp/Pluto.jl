/**
 * Pluto Notebook Parser
 *
 * Parses Pluto notebook (.jl) files and extracts NotebookData structure
 * compatible with the frontend Editor component.
 */

const NOTEBOOK_HEADER = "### A Pluto.jl notebook ###"
const CELL_ID_DELIMITER = "# ╔═╡ "
const CELL_METADATA_PREFIX = "# ╠═╡ "
const ORDER_DELIMITER = "# ╠═"
const ORDER_DELIMITER_FOLDED = "# ╟─"
const CELL_SUFFIX = "\n\n"
const DISABLED_PREFIX = "#=╠═╡\n"
const DISABLED_SUFFIX = "\n  ╠═╡ =#"

// Special cell IDs for package info
const PTOML_CELL_ID = "00000000-0000-0000-0000-000000000001"
const MTOML_CELL_ID = "00000000-0000-0000-0000-000000000002"

/**
 * Default cell metadata structure
 */
const DEFAULT_CELL_METADATA = {
    disabled: false,
    show_logs: true,
    skip_as_script: false,
}

/**
 * Parse a Pluto notebook file content and return NotebookData structure
 * @param {string} content - The raw content of the .jl notebook file
 * @param {string} [path=""] - The file path for the notebook
 * @returns {Object} NotebookData structure compatible with Pluto frontend
 */
function parseNotebook(content, path = "") {
    const lines = content.split("\n")

    // Validate header
    if (lines[0] !== NOTEBOOK_HEADER) {
        throw new Error("Invalid Pluto notebook file - missing header")
    }

    // Extract version (line 1 starts with "# ")
    const versionLine = lines[1] || ""
    const plutoVersion = versionLine.startsWith("# ") ? versionLine.slice(2) : "unknown"

    // Parse notebook metadata and find first cell delimiter
    const { notebookMetadata, firstCellIndex, hasBindMacro } = parseHeader(lines)

    if (firstCellIndex === -1) {
        throw new Error("No cells found in notebook")
    }

    // Parse cells (this gives us cells in their file order - topological order)
    const { cellInputs, cellResults, topologicalOrder, packageCells } = parseCells(lines, firstCellIndex)

    // Parse cell order (this gives us the display order)
    const cellOrder = parseCellOrder(lines, cellInputs)

    // Generate a notebook ID (in real usage, this would come from the server)
    const notebookId = generateUUID()

    // Create NotebookData structure
    /** @type import("../components/Editor").NotebookData  */
    const notebookData = {
        pluto_version: plutoVersion,
        notebook_id: notebookId,
        path: path,
        shortpath: path.split("/").pop() || "notebook.jl",
        in_temp_dir: false,
        process_status: "no_process",
        last_save_time: Date.now(),
        last_hot_reload_time: 0,
        cell_inputs: cellInputs,
        cell_results: cellResults,
        cell_dependencies: {},
        cell_order: cellOrder,
        cell_execution_order: [],
        published_objects: {},
        bonds: {},
        nbpkg: null,
        metadata: notebookMetadata,
        status_tree: null,
        // Store additional data needed for serialization
        _topological_order: topologicalOrder,
        _has_bind_macro: hasBindMacro,
        _package_cells: packageCells,
    }

    return notebookData
}

/**
 * Parse header section and extract notebook metadata
 * @param {string[]} lines - Array of file lines
 * @returns {Object} Object with notebookMetadata, firstCellIndex, and hasBindMacro
 */
function parseHeader(lines) {
    let notebookMetadata = {}
    let firstCellIndex = -1
    let hasBindMacro = false

    // Look for notebook metadata (lines starting with #>) and first cell
    for (let i = 2; i < lines.length; i++) {
        const line = lines[i]

        if (line.startsWith(CELL_ID_DELIMITER)) {
            firstCellIndex = i
            break
        }

        // Check if this line mentions @bind (crude check for now)
        if (line.includes("@bind")) {
            hasBindMacro = true
        }
    }

    // Extract notebook metadata lines (simple approach - could be enhanced)
    const metadataLines = []
    for (let i = 2; i < (firstCellIndex === -1 ? lines.length : firstCellIndex); i++) {
        const line = lines[i]
        if (line.startsWith("#> ")) {
            metadataLines.push(line.slice(3)) // Remove "#> " prefix
        }
    }

    // Store raw metadata for serialization
    if (metadataLines.length > 0) {
        notebookMetadata._raw_metadata_lines = metadataLines
    }

    return { notebookMetadata, firstCellIndex, hasBindMacro }
}

/**
 * Create default cell result structure
 * @param {string} cellId - Cell ID
 * @returns {Object} Default cell result object
 */
function createDefaultCellResult(cellId) {
    return {
        cell_id: cellId,
        queued: false,
        running: false,
        errored: false,
        runtime: null,
        downstream_cells_map: {},
        upstream_cells_map: {},
        precedence_heuristic: null,
        depends_on_disabled_cells: false,
        depends_on_skipped_cells: false,
        output: {
            body: "",
            persist_js_state: false,
            last_run_timestamp: 0,
            mime: "text/plain",
            rootassignee: null,
            has_pluto_hook_features: false,
        },
        logs: [],
        published_object_keys: [],
    }
}

/**
 * Parse cell metadata from lines
 * @param {string[]} lines - Array of file lines
 * @param {number} startIndex - Starting index
 * @returns {{metadata: Object, hasExplicitDisabledMetadata: boolean, endIndex: number}}
 */
function parseCellMetadata(lines, startIndex) {
    const metadata = { ...DEFAULT_CELL_METADATA }
    let hasExplicitDisabledMetadata = false
    let i = startIndex

    while (i < lines.length && lines[i].startsWith(CELL_METADATA_PREFIX)) {
        const metadataLine = lines[i].slice(CELL_METADATA_PREFIX.length)

        if (metadataLine.includes("disabled = true")) {
            metadata.disabled = true
            hasExplicitDisabledMetadata = true
        }
        if (metadataLine.includes("show_logs = false")) {
            metadata.show_logs = false
        }
        if (metadataLine.includes("skip_as_script = true")) {
            metadata.skip_as_script = true
        }
        i++
    }

    return { metadata, hasExplicitDisabledMetadata, endIndex: i }
}

/**
 * Collect lines until the next cell delimiter
 * @param {string[]} lines - Array of file lines
 * @param {number} startIndex - Starting index
 * @returns {{code: string, endIndex: number}}
 */
function collectCellCode(lines, startIndex) {
    const codeLines = []
    let i = startIndex

    while (i < lines.length && !lines[i].startsWith(CELL_ID_DELIMITER)) {
        codeLines.push(lines[i])
        i++
    }

    let code = codeLines.join("\n")
    if (code.endsWith(CELL_SUFFIX)) {
        code = code.slice(0, -CELL_SUFFIX.length)
    }

    return { code: code.trimEnd(), endIndex: i }
}

/**
 * Parse cells from notebook content
 * @param {string[]} lines - Array of file lines
 * @param {number} startIndex - Index where cells start
 * @returns {Object} Object with cellInputs, cellResults, and topologicalOrder
 */
function parseCells(lines, startIndex) {
    const cellInputs = {}
    const cellResults = {}
    const topologicalOrder = [] // Track the order cells appear in the file
    const packageCells = {} // Store package management cells separately

    let i = startIndex

    while (i < lines.length) {
        const line = lines[i]

        // Check for cell order section
        if (line === CELL_ID_DELIMITER + "Cell order:") {
            break
        }

        // Check for cell delimiter
        if (line.startsWith(CELL_ID_DELIMITER)) {
            const cellIdStr = line.slice(CELL_ID_DELIMITER.length)
            i++ // Move past cell delimiter

            // Handle special package cells differently
            if (cellIdStr === PTOML_CELL_ID || cellIdStr === MTOML_CELL_ID) {
                const { code, endIndex } = collectCellCode(lines, i)
                packageCells[cellIdStr] = code
                i = endIndex
                continue
            }

            // Parse cell metadata (optional)
            const { metadata, hasExplicitDisabledMetadata, endIndex: metadataEndIndex } = parseCellMetadata(lines, i)
            i = metadataEndIndex

            // Collect cell code
            const { code: rawCode, endIndex } = collectCellCode(lines, i)
            i = endIndex

            // Handle disabled cells
            let code = rawCode
            const trimmedCode = rawCode.trim()
            const isDisabledByWrapper = trimmedCode.startsWith(DISABLED_PREFIX.trim()) && trimmedCode.endsWith(DISABLED_SUFFIX.trim())
            if (isDisabledByWrapper) {
                code = rawCode.slice(rawCode.indexOf(DISABLED_PREFIX.trim()) + DISABLED_PREFIX.length, rawCode.lastIndexOf(DISABLED_SUFFIX.trim()))
                metadata.disabled = true
                // If there was no explicit disabled metadata, this is an implicit disabled cell
                if (!hasExplicitDisabledMetadata) {
                    metadata._implicit_disabled = true
                }
            }

            // Create cell input data
            cellInputs[cellIdStr] = {
                cell_id: cellIdStr,
                code: code,
                code_folded: false, // Will be set during order parsing
                metadata: metadata,
            }

            // Create corresponding cell result data
            cellResults[cellIdStr] = createDefaultCellResult(cellIdStr)

            // Track topological order
            topologicalOrder.push(cellIdStr)
        } else {
            i++
        }
    }

    return { cellInputs, cellResults, topologicalOrder, packageCells }
}

/**
 * Parse cell order from notebook content
 * @param {string[]} lines - Array of file lines
 * @param {Object} cellInputs - Cell inputs map to update folded state
 * @returns {string[]} Array of cell IDs in order
 */
function parseCellOrder(lines, cellInputs) {
    const cellOrder = []

    // Find cell order section
    let orderStartIndex = -1
    for (let i = 0; i < lines.length; i++) {
        if (lines[i] === CELL_ID_DELIMITER + "Cell order:") {
            orderStartIndex = i + 1
            break
        }
    }

    if (orderStartIndex === -1) {
        // If no explicit order, use the order cells appeared in file
        return Object.keys(cellInputs)
    }

    // Parse order lines
    for (let i = orderStartIndex; i < lines.length; i++) {
        const line = lines[i]

        if (line.startsWith(ORDER_DELIMITER) || line.startsWith(ORDER_DELIMITER_FOLDED)) {
            // Extract cell ID (last 36 characters should be the UUID)
            if (line.length >= 36) {
                const cellId = line.slice(-36)

                // Skip special package cells
                if (cellId === PTOML_CELL_ID || cellId === MTOML_CELL_ID) {
                    continue
                }

                // Check if cell exists
                if (cellInputs[cellId]) {
                    // Set folded state
                    cellInputs[cellId].code_folded = line.startsWith(ORDER_DELIMITER_FOLDED)
                    cellOrder.push(cellId)
                }
            }
        }
    }

    return cellOrder
}

/**
 * Generate a simple UUID (not cryptographically secure, for demo purposes)
 * @returns {string} UUID string
 */
function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0
        const v = c === "x" ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

/**
 * Generate @bind macro lines
 * @returns {string[]} Array of lines for the @bind macro
 */
function generateBindMacro() {
    return [
        "",
        "# This Pluto notebook uses @bind for interactivity. When running this notebook outside of Pluto, the following 'mock version' of @bind gives bound variables a default value (instead of an error).",
        "macro bind(def, element)",
        "    quote",
        '        local iv = try Base.loaded_modules[Base.PkgId(Base.UUID("6e696c72-6542-2067-7265-42206c756150"), "AbstractPlutoDingetjes")].Bonds.initial_value catch; b -> missing; end',
        "        local el = $(esc(element))",
        "        global $(esc(def)) = Core.applicable(Base.get, el) ? Base.get(el) : iv(el)",
        "        el",
        "    end",
        "end",
    ]
}

/**
 * Serialize cell metadata to lines
 * @param {Object} metadata - Cell metadata object
 * @returns {string[]} Array of metadata lines
 */
function serializeCellMetadata(metadata) {
    const lines = []

    // Only serialize non-default values
    if (metadata.disabled && !metadata._implicit_disabled) {
        lines.push(CELL_METADATA_PREFIX + "disabled = true")
    }
    if (metadata.show_logs !== undefined && metadata.show_logs !== DEFAULT_CELL_METADATA.show_logs) {
        lines.push(CELL_METADATA_PREFIX + `show_logs = ${metadata.show_logs}`)
    }
    if (metadata.skip_as_script !== undefined && metadata.skip_as_script !== DEFAULT_CELL_METADATA.skip_as_script) {
        lines.push(CELL_METADATA_PREFIX + `skip_as_script = ${metadata.skip_as_script}`)
    }
    return [
        ...lines,
        ...Object.entries(metadata)
            .filter(([name, entry]) => {
                return ["skip_as_script", "show_logs", "disabled"].includes(name)
            })
            .map(([name, entry]) => `${CELL_METADATA_PREFIX}${name} = ${entry}`),
    ]
}

/**
 * Serialize NotebookData back to Pluto notebook file format
 * @param {Object} notebookData - NotebookData structure
 * @returns {string} Notebook file content
 */
function serializeNotebook(notebookData) {
    const lines = []

    // Header
    lines.push(NOTEBOOK_HEADER)
    lines.push(`# ${notebookData.pluto_version || "v0.20.10"}`)
    lines.push("")

    // Notebook metadata
    if (notebookData.metadata && notebookData.metadata._raw_metadata_lines) {
        for (const metadataLine of notebookData.metadata._raw_metadata_lines) {
            lines.push("#> " + metadataLine)
        }
        lines.push("")
    }

    // Standard imports
    lines.push("using Markdown")
    lines.push("using InteractiveUtils")

    // Add @bind macro if needed
    if (notebookData._has_bind_macro) {
        lines.push(...generateBindMacro())
    }

    lines.push("")

    // Serialize cells in topological order (file order), not display order
    const topologicalOrder = notebookData._topological_order || notebookData.cell_order || []
    const cellInputs = notebookData.cell_inputs || {}

    for (const cellId of topologicalOrder) {
        const cellInput = cellInputs[cellId]
        if (!cellInput) continue

        // Cell delimiter
        lines.push(CELL_ID_DELIMITER + cellId)

        // Cell metadata (if not default)
        const metadata = cellInput.metadata || {}
        const metadataLines = serializeCellMetadata(metadata)
        lines.push(...metadataLines)

        // Cell code
        let code = cellInput.code || ""

        // Handle disabled cells - only add wrapper if not already present
        if (metadata.disabled && !code.startsWith(DISABLED_PREFIX)) {
            code = DISABLED_PREFIX + code + DISABLED_SUFFIX
        }

        // Add code and suffix
        lines.push(code)
        lines.push("")
    }

    // Add package cells if they exist
    const packageCells = notebookData._package_cells || {}
    if (packageCells[PTOML_CELL_ID]) {
        lines.push(CELL_ID_DELIMITER + PTOML_CELL_ID)
        lines.push(packageCells[PTOML_CELL_ID])
        lines.push("")
    }
    if (packageCells[MTOML_CELL_ID]) {
        lines.push(CELL_ID_DELIMITER + MTOML_CELL_ID)
        lines.push(packageCells[MTOML_CELL_ID])
        lines.push("")
    }

    // Cell order section (display order)
    lines.push(CELL_ID_DELIMITER + "Cell order:")

    const cellOrder = notebookData.cell_order || []
    for (const cellId of cellOrder) {
        const cellInput = cellInputs[cellId]
        if (!cellInput) continue

        const delimiter = cellInput.code_folded ? ORDER_DELIMITER_FOLDED : ORDER_DELIMITER
        lines.push(delimiter + cellId)
    }

    // Add package cells to order if they exist
    if (packageCells[PTOML_CELL_ID]) {
        lines.push(ORDER_DELIMITER_FOLDED + PTOML_CELL_ID)
    }
    if (packageCells[MTOML_CELL_ID]) {
        lines.push(ORDER_DELIMITER_FOLDED + MTOML_CELL_ID)
    }

    return lines.join("\n") + "\n"
}

// Export functions and constants
export { parseNotebook as default, serializeNotebook, DEFAULT_CELL_METADATA, PTOML_CELL_ID, MTOML_CELL_ID }
