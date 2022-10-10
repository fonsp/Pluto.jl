import { BackendLaunchPhase } from "../common/Binder"
import { deserialize_cells } from "../common/Serialization"
import { DEFAULT_CELL_METADATA, ProcessStatus, uuidv4 } from "../components/Editor"
import { signal, batch, computed, effect, useComputed, useSignal, useSignalEffect } from "../imports/Preact"

function createEditorState({ launch_params, initial_notebook_state }) {
    const notebook = /** @type {import("../components/Editor.js").NotebookData} */ signal(initial_notebook_state)
    const cell_inputs_local = /** @type {{ [id: string]: import("../components/Editor.js").CellInputData }} */ signal({})
    const desired_doc_query = signal(null)
    const recentry_deleted = /** @type {Array<{ index: number, cell: import("../components/Editor.js").CellInputData }>} */ signal([])
    const last_update_time = signal(0)

    const disable_ui = signal(launch_params.disable_ui)
    const static_preview = signal(launch_params.statefile != null)

    const backend_launch_phase = signal(
        launch_params.notebookfile != null && (launch_params.binder_url != null || launch_params.pluto_server_url != null)
            ? BackendLaunchPhase.wait_for_user
            : null
    )
    const binder_session_url = signal(null)
    const binder_session_token = signal(null)
    const connected = signal(false)
    const initializing = signal(true)
    const moving_file = signal(false)
    const scroller = signal({ up: false, down: false })
    const export_menu_open = signal(false)
    const last_created_cell = signal(null)
    const selected_cells = signal([])
    const extended_components = signal({ CustomHeader: null })
    const is_recording = signal(false)
    const recording_waiting_to_start = signal(false)
    const is_process_ready = computed(() => {
        return notebook.value.process_status === ProcessStatus.starting || notebook.value.process_status === ProcessStatus.ready
    })
    // Actions
    const get_notebook = () => notebook
    const client = signal(() => null)
    const get_published_object = (object_id) => notebook.value?.published_objects[object_id]

    const update_notebook = (fn) => (notebook.value = fn()) // TODO: Revisit this

    const set_doc_query = (query) => {
        desired_doc_query.value = query
    }
    const set_local_cell = (cell_id, new_val) => {
        cell_inputs_local.value[cell_id] = new_val
        selected_cells.value = []
    }
    const focus_on_neighbor = (cell_id, delta, line = delta === -1 ? Infinity : -1, ch = 0) => {
        const i = notebook.value.cell_order.indexOf(cell_id)
        const new_i = i + delta
        if (new_i >= 0 && new_i < notebook.value.cell_order.length) {
            window.dispatchEvent(
                new CustomEvent("cell_focus", {
                    detail: {
                        cell_id: notebook.value.cell_order[new_i],
                        line: line,
                        ch: ch,
                    },
                })
            )
        }
    }

    const add_deserialized_cells = async (data, index_or_id, deserializer = deserialize_cells) => {
        let new_codes = deserializer(data)
        /** @type {Array<import("../components/Editor").CellInputData>} */
        /** Create copies of the cells with fresh ids */
        let new_cells = new_codes.map((code) => ({
            cell_id: uuidv4(),
            code: code,
            code_folded: false,
        }))

        let index

        if (typeof index_or_id === "number") {
            index = index_or_id
        } else {
            /* if the input is not an integer, try interpreting it as a cell id */
            index = notebook.value.cell_order.indexOf(index_or_id)
            if (index !== -1) {
                /* Make sure that the cells are pasted after the current cell */
                index += 1
            }
        }

        if (index === -1) {
            index = notebook.value.cell_order.length
        }

        /** Update local_code. Local code doesn't force CM to update it's state
         * (the usual flow is keyboard event -> cm -> local_code and not the opposite )
         * See ** 1 **
         */
        selected_cells.value = []
        const intermediate = { ...cell_inputs_local.value }
        for (let cell of new_cells) {
            intermediate[cell.cell_id] = cell
        }
        cell_inputs_local.value = intermediate
        last_created_cell.value = new_cells[0]?.cell_id

        /**
         * Create an empty cell in the julia-side.
         * Code will differ, until the user clicks 'run' on the new code
         */

        await batch(() => {
            const nb = notebook.value
            for (const cell of new_cells) {
                nb.cell_inputs[cell.cell_id] = {
                    ...cell,
                    // Fill the cell with empty code remotely, so it doesn't run unsafe code
                    code: "",
                    metadata: {
                        ...DEFAULT_CELL_METADATA,
                    },
                }
            }
            nb.cell_order = [...nb.cell_order.slice(0, index), ...new_cells.map((x) => x.cell_id), ...nb.cell_order.slice(index, Infinity)]
            notebook.value = nb
        })
    }
    const wrap_remote_cell = (cell_id, block_start = "begin", block_end = "end") => {
        const cell = notebook.value.cell_inputs[cell_id]
        const new_code = `${block_start}\n\t${cell.code.replace(/\n/g, "\n\t")}\n${block_end}`
        const cil = { ...cell_inputs_local.value } // local copy
        cil[cell_id] = {
            // edits
            ...cell,
            ...cil[cell_id],
            code: new_code,
        }
        cell_inputs_local.value = cil // flush back
    }
    const set_and_run_multiple = async (cell_ids) => {
        if (cell_ids.length < 0 || !cell_ids.length) return
        const cell_inputs_local_read_only = cell_inputs_local.value
        const nb = { ...notebook.value }
        for (let cell_id of cell_ids) {
            if (cell_inputs_local_read_only[cell_id]) {
                nb.cell_inputs[cell_id].code = cell_inputs_local_read_only[cell_id]
            }
        }

        for (let cell_id of cell_ids) {
            if (nb.cell_results[cell_id] != null) {
                nb.cell_results[cell_id].queued = is_process_ready.value
            }
        }
        await update_notebook(() => nb)

        await client.value.send("run_multiple_cells", { cells: cell_ids }, { notebook_id: notebook.value.notebook_id })
    }
}
