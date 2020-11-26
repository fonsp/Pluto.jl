import { PlutoContext } from "../common/PlutoContext.js"
import { html, useContext, useEffect, useMemo } from "../imports/Preact.js"

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
        selected_cells,
    ])
}

/**
 * @param {{
 *  is_loading: boolean
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
    is_loading,
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
        if (notebook.cell_order.length === 0 && !is_loading) {
            console.log("GO ADD CELL")
            // pluto_actions.add_remote_cell_at(0)
        }
    }, [is_loading, notebook.cell_order.length])

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
                    selected_cells=${selected_cells}
                />`
            )}
        </pluto-notebook>
    `
}

export const NotebookMemo = ({
    is_loading,
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
                is_loading=${is_loading}
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
    }, [is_loading, notebook, cells_local, on_update_doc_query, on_cell_input, on_focus_neighbor, disable_input, last_created_cell, selected_cells])
}
