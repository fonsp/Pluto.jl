import { html, Component, useState, useEffect, useRef } from "../common/Preact.js"
import observablehq from "../common/SetupCellEnvironment.js"
import { cl } from "../common/ClassTable.js"

import { RawHTMLContainer } from "./CellOutput.js"

export const LiveDocs = ({ desired_doc_query, on_update_doc_query, client, notebook }) => {
    const [shown_query, set_shown_query] = useState(null)
    const [searched_query, set_searched_query] = useState(null)
    const [body, set_body] = useState("Start typing in a cell to learn more!")
    const [hidden, set_hidden] = useState(true)
    const [loading, set_loading] = useState(false)

    const liveDocRef = useRef()

    const fetch_docs = () => {
        const new_query = desired_doc_query
        set_loading(true)
        set_searched_query(new_query)

        Promise.race([
            observablehq.Promises.delay(2000, false),
            client.send("docs", { query: new_query }, { notebook_id: notebook.notebook_id }).then((u) => {
                if (u.message.status === "⌛") {
                    return false
                }
                if (u.message.status === "👍") {
                    set_shown_query(new_query)
                    set_body(u.message.doc)
                    return true
                }
            })
        ]).then(() => {
            set_loading(false)
        })
    }

    useEffect(() => {
        window.addEventListener("open_live_docs", () => {
            // https://github.com/fonsp/Pluto.jl/issues/321
            set_hidden(false)
            if (window.getComputedStyle(liveDocRef.current).display === "none") {
                alert("This browser window is too small to show docs.\n\nMake the window bigger, or try zooming out.")
            }
        })
    }, [])

    useEffect(() => {
        if (hidden || loading) {
            return
        }
        if (!/[^\s]/.test(desired_doc_query)) {
            // only whitespace
            return
        }

        if (searched_query === desired_doc_query) {
            return
        }

        fetch_docs()
    })

    return html`
        <aside id="helpbox-wrapper">
            <pluto-helpbox class=${cl({ hidden, loading })}>
                <header onClick=${() => set_hidden(!hidden)}>${hidden || searched_query == null ? "Live docs" : searched_query}</header>
                <section>
                    <h1><code>${shown_query}</code></h1>
                    <${RawHTMLContainer} body=${body} pure=${true} on_render=${(n) => resolve_doc_reference_links(n, on_update_doc_query)} />
                </section>
            </pluto-helpbox>
        </aside>
    `
}

const resolve_doc_reference_links = (node, on_update_doc_query) => {
    const as = node.querySelectorAll("a")
    as.forEach((a) => {
        const href = a.getAttribute("href")
        if (href != null && href.startsWith("@ref")) {
            const query = href.length > 4 ? href.substr(5) : a.textContent
            a.onclick = (e) => {
                on_update_doc_query(query)
                e.preventDefault()
            }
        }
    })
}
