import { html, useEffect, useRef } from "../imports/Preact.js"

import { Cell } from "./Cell.js"

export const Notebook = ({
    is_loading,
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
    // This might look kinda silly...
    // and it is... but it covers all the cases... - DRAL
    useEffect(() => {
        if (cells.length === 0 && !is_loading) {
            requests.add_remote_cell_at(0)
        }
    }, [is_loading, cells.length])

    return html`
        <pluto-notebook id=${notebook_id}>
            ${cells.map(
                (d) => html`<${Cell}
                    ...${d}
                    key=${d.cell_id}
                    on_update_doc_query=${on_update_doc_query}
                    on_change=${(val) => on_cell_input(d, val)}
                    on_focus_neighbor=${on_focus_neighbor}
                    disable_input=${disable_input}
                    focus_after_creation=${focus_after_creation && !d.pasted}
                    scroll_into_view_after_creation=${d.pasted}
                    all_completed_promise=${all_completed_promise}
                    selected_friends=${selected_friends}
                    requests=${requests}
                    client=${client}
                    notebook_id=${notebook_id}
                />`
            )}
        </pluto-notebook>
    `
}
