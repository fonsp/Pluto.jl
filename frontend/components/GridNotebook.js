import { PlutoContext } from "../common/PlutoContext.js"
import { require } from "../common/SetupCellEnvironment.js"
import { html, useContext, useEffect, useMemo, useState } from "../imports/Preact.js"
import { Cell } from "./Cell.js"
const ReactGridLayout = window.ReactGridLayout.WidthProvider(window.ReactGridLayout)

let CellMemo = ({
    cell_input,
    cell_result,
    selected,
    cell_input_local,
    notebook_id,
    on_update_doc_query,
    on_cell_input,
    on_focus_neighbor,
    disable_input,
    focus_after_creation,
    force_hide_input,
    selected_cells,
}) => {
    const selected_cells_diffable_primitive = (selected_cells || []).join("")
    const { body, last_run_timestamp, mime, persist_js_state, rootassignee } = cell_result?.output || {}
    const { queued, running, runtime, errored } = cell_result || {}
    const { cell_id, code, code_folded } = cell_input || {}
    return useMemo(() => {
        return html`
            <${Cell}
                on_change=${(val) => on_cell_input(cell_input.cell_id, val)}
                cell_input=${cell_input}
                cell_result=${cell_result}
                selected=${selected}
                cell_input_local=${cell_input_local}
                notebook_id=${notebook_id}
                on_update_doc_query=${on_update_doc_query}
                on_focus_neighbor=${on_focus_neighbor}
                disable_input=${disable_input}
                focus_after_creation=${focus_after_creation}
                force_hide_input=${force_hide_input}
                selected_cells=${selected_cells}
            />
        `
    }, [
        cell_id,
        code,
        code_folded,
        queued,
        running,
        runtime,
        errored,
        body,
        last_run_timestamp,
        mime,
        persist_js_state,
        rootassignee,
        selected,
        cell_input_local,
        notebook_id,
        on_update_doc_query,
        on_cell_input,
        on_focus_neighbor,
        disable_input,
        focus_after_creation,
        force_hide_input,
        selected_cells_diffable_primitive,
    ])
}

/**
 * We render all cell outputs directly when the page loads. Rendering cell *inputs* can slow down the initial page load significantly, so we delay rendering them using this heuristic function to determine the length of the delay (as a function of the number of cells in the notebook).
 * @param {Number} num_cells
 */
const render_cell_inputs_delay = (num_cells) => (num_cells > 20 ? 500 : 100)
/**
 * The first <x> cells will bypass the {@link render_cell_inputs_delay} heuristic and render directly.
 */
const render_cell_inputs_minimum = 5

/**
 * @param {{
 *  is_initializing: boolean
 *  notebook: import("./Editor.js").NotebookData,
 *  selected_cells: Array<string>,
 *  cell_inputs_local: { [uuid: string]: import("./Editor.js").CellInputData },
 *  last_created_cell: string,
 *  on_update_doc_query: any,
 *  on_cell_input: any,
 *  on_focus_neighbor: any,
 *  disable_input: any,
 *  focus_after_creation: any,
 * }} props
 * */
export const Notebook = ({
    is_initializing,
    notebook,
    selected_cells,
    cell_inputs_local,
    last_created_cell,
    on_update_doc_query,
    on_cell_input,
    on_focus_neighbor,
    disable_input,
}) => {
    // This might look kinda silly...
    // and it is... but it covers all the cases... - DRAL
    let pluto_actions = useContext(PlutoContext)
    useEffect(() => {
        if (notebook.cell_order.length === 0 && !is_initializing) {
            pluto_actions.add_remote_cell_at(0)
        }
    }, [is_initializing, notebook.cell_order.length])

    const [is_first_load, set_is_first_load] = useState(true)

    useEffect(() => {
        if (is_first_load && notebook.cell_order.length > 0) {
            setTimeout(() => {
                set_is_first_load(false)
            }, render_cell_inputs_delay(notebook.cell_order.length))
        }
    }, [is_first_load, notebook.cell_order.length])
    return html`
        <${CustomGrid}
            notebook=${notebook}
            is_initializing=${is_initializing}
            selected_cells=${selected_cells}
            cell_inputs_local=${cell_inputs_local}
            last_created_cell=${last_created_cell}
            on_update_doc_query=${on_update_doc_query}
            on_cell_input=${on_cell_input}
            on_focus_neighbor=${on_focus_neighbor}
            disable_input=${disable_input}
            is_first_load=${is_first_load}
        />
    `
}

function CustomGrid({
    notebook,
    is_initializing,
    selected_cells,
    cell_inputs_local,
    last_created_cell,
    on_update_doc_query,
    on_cell_input,
    on_focus_neighbor,
    disable_input,
    is_first_load,
}) {
    const COLS = 4
    const [layout, setLayout] = useState(() =>
        new Array(notebook.cell_order.length).fill(0).map((x, idx) => {
            return {
                x: 0,
                y: idx,
                w: 1,
                h: 2,
                i: idx.toString(),
            }
        })
    )
    return html`<${ReactGridLayout}
                    cols=${COLS}
                    className="layout"
                    items=${notebook.cell_order.length}
                    rowHeight=${60}
                    draggable
                    onLayoutChange=${function () {}},
                    onLayoutChange=${console.log}>
                        ${notebook.cell_order.map((cell_id, idx) => {
                            return html`<div key=${idx}>
                                <div data-grid=${{ ...layout[idx] }} class="borderThis">
                                    <${CellMemo}
                                        key=${cell_id}
                                        cell_input=${notebook.cell_inputs[cell_id]}
                                        cell_result=${notebook.cell_results[cell_id] ?? {
                                            cell_id: cell_id,
                                            queued: false,
                                            running: false,
                                            errored: false,
                                            runtime: null,
                                            output: null,
                                        }}
                                        selected=${selected_cells.includes(cell_id)}
                                        cell_input_local=${cell_inputs_local[cell_id]}
                                        notebook_id=${notebook.notebook_id}
                                        on_update_doc_query=${on_update_doc_query}
                                        on_cell_input=${on_cell_input}
                                        on_focus_neighbor=${on_focus_neighbor}
                                        disable_input=${disable_input}
                                        focus_after_creation=${last_created_cell === cell_id}
                                        force_hide_input=${is_first_load && idx > render_cell_inputs_minimum}
                                        selected_cells=${selected_cells}
                                    />
                                </div>
                            </div>`
                        })}
                    </${ReactGridLayout}>`
}

export const NotebookMemo = Notebook
