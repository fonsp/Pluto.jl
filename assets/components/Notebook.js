import { html } from "./Editor.js"

import { Cell } from "./Cell.js"

export const Notebook = ({ cells, on_update_doc_query, on_cell_input, disable_input, all_completed_promise, requests  }) => {
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
                    all_completed_promise=${all_completed_promise}
                    requests=${requests}
                />`
            )}
        </notebook>
    `
}