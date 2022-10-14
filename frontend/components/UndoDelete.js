import { html, useState, useEffect } from "../imports/Preact.js"
import { cl } from "../common/ClassTable.js"
import { open_pluto_popup } from "./Popup.js"

export const UndoDelete = ({ recently_deleted, on_click }) => {
    const [hidden, set_hidden] = useState(true)

    useEffect(() => {
        if (recently_deleted != null) {
            set_hidden(false)
            const interval = setTimeout(() => {
                set_hidden(true)
            }, 8000 * Math.pow(recently_deleted.length, 1 / 3))

            return () => {
                clearTimeout(interval)
            }
        }
    }, [recently_deleted])

    let text = recently_deleted == null ? "" : recently_deleted.length === 1 ? "Cell deleted" : `${recently_deleted.length} cells deleted`

    return html`
        <nav
            id="undo_delete"
            class=${cl({
                hidden: hidden,
            })}
        >
            ${text} (<a
                href="#"
                onClick=${(e) => {
                    e.preventDefault()
                    set_hidden(true)

                    on_click()
                }}
                >UNDO</a
            >)
        </nav>
    `
}

/**
 * @param {{
 *  notebook: import("./Editor.js").NotebookData,
 *  recently_auto_disabled_cells: [number, Array<string>],
 * }} props
 * */
export const RecentlyDisabledInfo = ({ notebook, recently_auto_disabled_cells }) => {
    useEffect(() => {
        recently_auto_disabled_cells[1].forEach((cell_id) => {
            open_pluto_popup({
                type: "info",
                source_element: document.getElementById(cell_id),
                body: html`Another cell has been disabled automatically.`,
            })
        })
    }, [recently_auto_disabled_cells])

    return null
}
