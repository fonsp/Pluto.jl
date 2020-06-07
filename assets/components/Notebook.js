import { html } from "./Editor.js"

import { Cell } from "./Cell.js"

export const Notebook = ({ cells, on_update_doc_query, on_cell_input, requests, disable_input }) => {
    return html`
        <notebook>
            ${cells.map(
                (d) => html`<${Cell}
                    ...${d}
                    key=${d.cell_id}
                    createfocus=${false}
                    on_update_doc_query=${on_update_doc_query}
                    on_change=${(val) => on_cell_input(d, val)}
                    disable_input=${disable_input}
                    requests=${requests}
                />`
            )}
        </notebook>
    `
}

// if (cell_id in localCells) {
//     console.warn("Tried to add cell with existing cell_id. Canceled.")
//     console.log(cell_id)
//     console.log(localCells)
//     return localCells[cell_id]
// }
