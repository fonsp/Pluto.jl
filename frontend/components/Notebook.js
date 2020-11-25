import { html, useEffect, useRef } from "../imports/Preact.js"

import { Cell } from "./Cell.js"

/**
 * @param {{
 *  is_loading: boolean
 *  notebook: import("./Editor.js").NotebookData,
 *  selected_cells: Array<string>,
 *  cells_local: { [uuid: string]: import("./Editor.js").CellData },
 *  on_update_doc_query: any,
 *  on_cell_input: any,
 *  on_focus_neighbor: any,
 *  disable_input: any,
 *  focus_after_creation: any,
 *  selected_friends: any,
 *  requests: any,
 *  client: any,
 * }} props
 * */
export const Notebook = ({
    is_loading,
    notebook,
    selected_cells,
    cells_local,
    on_update_doc_query,
    on_cell_input,
    on_focus_neighbor,
    disable_input,
    focus_after_creation,
    selected_friends,
    requests,
    client,
}) => {
    // This might look kinda silly...
    // and it is... but it covers all the cases... - DRAL
    useEffect(() => {
        if (notebook.cell_order.length === 0 && !is_loading) {
            // requests.add_remote_cell_at(0)
        }
    }, [is_loading, notebook.cell_order.length])

    return html`
        <pluto-notebook id=${notebook.notebook_id}>
            ${notebook.cell_order.map(
                (cell_id) => html`<${Cell}
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
                    on_change=${(val) => on_cell_input(cell_id, val)}
                    on_focus_neighbor=${on_focus_neighbor}
                    disable_input=${disable_input}
                    focus_after_creation=${false /* focus_after_creation && !d.pasted */}
                    scroll_into_view_after_creation=${false /* d.pasted */}
                    selected_friends=${selected_friends}
                    requests=${requests}
                    client=${client}
                />`
            )}
        </pluto-notebook>
    `
}
