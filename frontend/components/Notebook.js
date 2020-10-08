import { html } from "../common/Preact.js"
import { map_cmd_to_ctrl_on_mac, has_ctrl_or_cmd_pressed } from "../common/KeyboardShortcuts.js"

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
    add_textmarkers,
    findreplace_word,
    set_findreplace_word,
    set_code_selected,
    client,
    notebook_id,
}) => {
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
                    add_textmarkers=${add_textmarkers}
                    findreplace_word=${findreplace_word}
                    set_findreplace_word=${set_findreplace_word}
                    set_code_selected=${set_code_selected}
                />`
            )}
        </pluto-notebook>
    `
}
