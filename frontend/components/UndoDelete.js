import { html, useState, useEffect } from "../imports/Preact.js"
import { cl } from "../common/ClassTable.js"
import { scroll_cell_into_view } from "./Scroller.js"
import { open_pluto_popup } from "../common/open_pluto_popup.js"

export const UndoDelete = ({ recently_deleted, on_click }) => {
    const [hidden, set_hidden] = useState(true)

    useEffect(() => {
        if (recently_deleted != null && recently_deleted.length > 0) {
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
            inert=${hidden}
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
 *  recently_auto_disabled_cells: Map<string,[string,string]>,
 * }} props
 * */
export const RecentlyDisabledInfo = ({ notebook, recently_auto_disabled_cells }) => {
    useEffect(() => {
        Object.entries(recently_auto_disabled_cells).forEach(([cell_id, reason]) => {
            open_pluto_popup({
                type: "info",
                source_element: document.getElementById(reason[0]),
                body: html`<a
                        href=${`#${cell_id}`}
                        onClick=${(e) => {
                            scroll_cell_into_view(cell_id)
                            e.preventDefault()
                            e.stopPropagation()
                        }}
                        >Another cell</a
                    >${` has been disabled because it also defined `}<code class="auto_disabled_variable">${reason[1]}</code>.`,
            })
        })
    }, [recently_auto_disabled_cells])

    return null
}
