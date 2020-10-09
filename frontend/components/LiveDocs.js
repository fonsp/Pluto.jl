import { html, useState, useRef, useLayoutEffect, useEffect, useMemo } from "../common/Preact.js"
import immer from "https://cdn.jsdelivr.net/npm/immer@7.0.9/dist/immer.esm.js"
import observablehq from "../common/SetupCellEnvironment.js"
import { cl } from "../common/ClassTable.js"

import { RawHTMLContainer, highlight_julia } from "./CellOutput.js"

export let LiveDocs = ({ desired_doc_query, client, on_update_doc_query, notebook }) => {
    let container_ref = useRef()
    let [state, set_state] = useState({
        shown_query: null,
        searched_query: null,
        body: "Start typing in a cell to learn more!",
        hidden: true,
        loading: false,
    })
    let update_state = (mutation) => set_state(immer((state) => mutation(state)))

    // Open docs when "open_live_docs" event is triggered
    useEffect(() => {
        let handler = () => {
            // https://github.com/fonsp/Pluto.jl/issues/321
            update_state((state) => {
                state.hidden = false
            })
            if (window.getComputedStyle(container_ref.current).display === "none") {
                alert("This browser window is too small to show docs.\n\nMake the window bigger, or try zooming out.")
            }
        }
        window.addEventListener("open_live_docs", handler)
        return () => window.removeEventListener("open_live_docs", handler)
    }, [])

    // Apply syntax highlighting to code blocks:
    // In the standard HTML container we already do this for code.language-julia blocks,
    // but in the docs it's safe to extend to to all highlighting I think
    useLayoutEffect(() => {
        // Actually, showing the jldoctest stuff wasn't as pretty... should make a mode for that sometimes
        // for (let code_element of container_ref.current.querySelectorAll("code.language-jldoctest")) {
        //     highlight_julia(code_element)
        // }
        for (let code_element of container_ref.current.querySelectorAll("code:not([class])")) {
            highlight_julia(code_element)
        }
    }, [state.body])

    useEffect(() => {
        if (state.hidden || state.loading) {
            return
        }
        if (!/[^\s]/.test(desired_doc_query)) {
            // only whitespace
            return
        }

        if (state.searched_query !== desired_doc_query) {
            fetch_docs()
        }
    }, [desired_doc_query])

    let fetch_docs = () => {
        const new_query = desired_doc_query
        update_state((state) => {
            state.loading = true
            state.searched_query = new_query
        })
        Promise.race([
            observablehq.Promises.delay(2000, false),
            client.send("docs", { query: new_query }, { notebook_id: notebook.notebook_id }).then((u) => {
                if (u.message.status === "⌛") {
                    return false
                }
                if (u.message.status === "👍") {
                    update_state((state) => {
                        state.shown_query = new_query
                        state.body = u.message.doc
                    })
                    return true
                }
            }),
        ]).then(() => {
            update_state((state) => {
                state.loading = false
            })
        })
    }

    let docs_element = useMemo(() => html` <${RawHTMLContainer} body=${state.body} /> `, [state.body])

    return html`
        <aside id="helpbox-wrapper" ref=${container_ref}>
            <pluto-helpbox class=${cl({ hidden: state.hidden, loading: state.loading })}>
                <header onClick=${() => set_state((state) => ({ ...state, hidden: !state.hidden }))}>
                    ${state.hidden || state.searched_query == null ? "Live docs" : state.searched_query}
                </header>
                <section ref=${(ref) => ref != null && resolve_doc_reference_links(ref, on_update_doc_query)}>
                    <h1><code>${state.shown_query}</code></h1>
                    ${docs_element}
                </section>
            </pluto-helpbox>
        </aside>
    `
}

const resolve_doc_reference_links = (node, on_update_doc_query) => {
    for (let anchor of node.querySelectorAll("a")) {
        const href = anchor.getAttribute("href")
        if (href != null && href.startsWith("@ref")) {
            const query = href.length > 4 ? href.substr(5) : anchor.textContent
            anchor.onclick = (e) => {
                on_update_doc_query(query)
                e.preventDefault()
            }
        }
    }
}
