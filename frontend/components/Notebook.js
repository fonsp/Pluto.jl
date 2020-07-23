import { html } from "../common/Preact.js"

import { Cell } from "./Cell.js"

export const Notebook = ({
    cells,
    on_update_doc_query,
    on_cell_input,
    on_focus_neighbor,
    disable_input,
    focus_after_creation,
    all_completed_promise,
    selected_friends,
    requests,
    client,
    notebook_id,
}) => {
    return html`
        <notebook>
            ${cells.map(
                (d) => html`<${Cell}
                    ...${d}
                    key=${d.cell_id}
                    on_update_doc_query=${on_update_doc_query}
                    on_change=${(val) => on_cell_input(d, val)}
                    on_focus_neighbor=${on_focus_neighbor}
                    disable_input=${disable_input}
                    focus_after_creation=${focus_after_creation}
                    all_completed_promise=${all_completed_promise}
                    selected_friends=${selected_friends}
                    requests=${requests}
                    client=${client}
                    notebook_id=${notebook_id}
                />`
            )}
        </notebook>
    `
}
