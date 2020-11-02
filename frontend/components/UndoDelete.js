import { html, useState, useEffect } from "../imports/Preact.js"
import { cl } from "../common/ClassTable.js"

export const UndoDelete = ({ recently_deleted, on_click }) => {
    const [hidden, set_hidden] = useState(true)

    useEffect(() => {
        if (recently_deleted != null) {
            set_hidden(false)
            const interval = setInterval(() => {
                set_hidden(true)
            }, 8000)

            return () => {
                clearInterval(interval)
            }
        }
    }, [recently_deleted])

    return html`
        <nav
            id="undo_delete"
            class=${cl({
                hidden: hidden,
            })}
        >
            Cell deleted (<a
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
