import { PlutoContext } from "../common/PlutoContext.js"
import { html, useContext, useEffect, useMemo, useState } from "../imports/Preact.js"

import { Cell } from "./Cell.js"

let CellMemo = ({
    cell,
    cell_state,
    selected,
    cell_local,
    notebook_id,
    on_update_doc_query,
    on_cell_input,
    on_focus_neighbor,
    disable_input,
    focus_after_creation,
    force_hide_input,
    selected_cells,
}) => {
    return useMemo(() => {
        return html`
            <${Cell}
                on_change=${(val) => on_cell_input(cell.cell_id, val)}
                cell=${cell}
                cell_state=${cell_state}
                selected=${selected}
                cell_local=${cell_local}
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
        cell,
        cell_state,
        selected,
        cell_local,
        notebook_id,
        on_update_doc_query,
        on_cell_input,
        on_focus_neighbor,
        disable_input,
        focus_after_creation,
        force_hide_input,
        selected_cells,
    ])
}

/**
 * @param {{
 *  is_initializing: boolean
 *  notebook: import("./Editor.js").NotebookData,
 *  selected_cells: Array<string>,
 *  cells_local: { [uuid: string]: import("./Editor.js").CellData },
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
    cells_local,
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
            console.log("GO ADD CELL")
            pluto_actions.add_remote_cell_at(0)
        }
    }, [is_initializing, notebook.cell_order.length])

    const [is_first_load, set_is_first_load] = useState(true)

    if (is_first_load && notebook.cell_order.length > 0) {
        setTimeout(
            () => {
                set_is_first_load(false)
            },
            notebook.cell_order.length > 20 ? 500 : 100
        )
    }
    return html`
        <pluto-notebook id=${notebook.notebook_id}>
            ${notebook.cell_order.map(
                (cell_id) => html`<${CellMemo}
                    key=${cell_id}
                    cell=${notebook.cell_dict[cell_id]}
                    cell_state=${notebook.cells_running[cell_id] ?? {
                        cell_id: cell_id,
                        queued: false,
                        running: false,
                        errored: false,
                        runtime: null,
                        output: null,
                    }}
                    selected=${selected_cells.includes(cell_id)}
                    cell_local=${cells_local[cell_id]}
                    notebook_id=${notebook.notebook_id}
                    on_update_doc_query=${on_update_doc_query}
                    on_cell_input=${on_cell_input}
                    on_focus_neighbor=${on_focus_neighbor}
                    disable_input=${disable_input}
                    focus_after_creation=${last_created_cell === cell_id}
                    force_hide_input=${is_first_load}
                    selected_cells=${selected_cells}
                />`
            )}
        </pluto-notebook>
    `
}

export const NotebookMemo = ({
    is_initializing,
    notebook,
    cells_local,
    on_update_doc_query,
    on_cell_input,
    on_focus_neighbor,
    disable_input,
    last_created_cell,
    selected_cells,
}) => {
    return useMemo(() => {
        return html`
            <${Notebook}
                is_initializing=${is_initializing}
                notebook=${notebook}
                cells_local=${cells_local}
                on_update_doc_query=${on_update_doc_query}
                on_cell_input=${on_cell_input}
                on_focus_neighbor=${on_focus_neighbor}
                disable_input=${disable_input}
                last_created_cell=${last_created_cell}
                selected_cells=${selected_cells}
            />
        `
    }, [is_initializing, notebook, cells_local, on_update_doc_query, on_cell_input, on_focus_neighbor, disable_input, last_created_cell, selected_cells])
}
