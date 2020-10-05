import { html, useState, useEffect, useRef } from "../common/Preact.js"
import observablehq from "../common/SetupCellEnvironment.js"
import { cl } from "../common/ClassTable.js"

import { RawHTMLContainer } from "./CellOutput.js"

export const LiveDocs = ({ desired_doc_query, on_update_doc_query, client, notebook }) => {
    const [shown_query, set_shown_query] = useState(null)
    const [searched_query, set_searched_query] = useState(null)
    const [body, set_body] = useState("Start typing in a cell or search box above to learn more!")
    const [hidden, set_hidden] = useState(true)
    const [loading, set_loading] = useState(false)

    const helpboxRef = useRef()
    const liveDocSearchRef = useRef()

    const fetch_docs = (new_query) => {
        set_loading(true)

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

    // useOpenLiveDocsFromCell
    useEffect(() => {
        window.addEventListener("open_live_docs", () => {
            // https://github.com/fonsp/Pluto.jl/issues/321
            set_hidden(false)
            if (window.getComputedStyle(helpboxRef.current).display === "none") {
                alert("This browser window is too small to show docs.\n\nMake the window bigger, or try zooming out.")
            }
        })
    }, [])

    // useQueryFromCell
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

        liveDocSearchRef.current.innerText = desired_doc_query
        set_searched_query(desired_doc_query)
        fetch_docs(desired_doc_query)
    }, [desired_doc_query])

    return html`
        <aside id="helpbox-wrapper" ref=${helpboxRef}>
            <pluto-helpbox class=${cl({ hidden, loading })}>
                <header
                    id="live-docs-search"
                    ref=${liveDocSearchRef}
                    onClick=${() => {
                        set_hidden(false)
                        setTimeout(() => liveDocSearchRef.current.focus(), 0)
                    }}
                    onInput=${(e) => {
                        if(e.target.innerText === "") {
                            e.target.innerText = ZERO_WIDTH_SPACE
                        }
                        const cleanedText = e.target.innerText.replace(ZERO_WIDTH_SPACE, "").trim()
                        fetch_docs(cleanedText)
                    }}
                    contenteditable=${!hidden}
                >
                    ${hidden ? "Live docs" : ZERO_WIDTH_SPACE}
                </header>
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

const ZERO_WIDTH_SPACE = "⁣"
