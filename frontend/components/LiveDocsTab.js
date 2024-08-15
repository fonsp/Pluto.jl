import { html, useState, useRef, useLayoutEffect, useEffect, useMemo, useContext } from "../imports/Preact.js"
import immer from "../imports/immer.js"
import observablehq from "../common/SetupCellEnvironment.js"

import { RawHTMLContainer, highlight } from "./CellOutput.js"
import { PlutoActionsContext } from "../common/PlutoContext.js"
import { cl } from "../common/ClassTable.js"

/**
 * @param {{
 * focus_on_open: boolean,
 * desired_doc_query: string?,
 * on_update_doc_query: (query: string) => void,
 * notebook: import("./Editor.js").NotebookData,
 * sanitize_html?: boolean,
 * }} props
 */
export let LiveDocsTab = ({ focus_on_open, desired_doc_query, on_update_doc_query, notebook, sanitize_html = true }) => {
    let pluto_actions = useContext(PlutoActionsContext)
    let live_doc_search_ref = useRef(/** @type {HTMLInputElement?} */ (null))

    // This is all in a single state object so that we can update multiple field simultaneously
    let [state, set_state] = useState({
        shown_query: null,
        searched_query: null,
        body: `<p>Welcome to the <b>Live docs</b>! Keep this little window open while you work on the notebook, and you will get documentation of everything you type!</p><p>You can also type a query above.</p><hr><p><em>Still stuck? Here are <a target="_blank" href="https://julialang.org/about/help/">some tips</a>.</em></p>`,
        loading: false,
    })
    let update_state = (mutation) => set_state(immer((state) => mutation(state)))

    useEffect(() => {
        if (state.loading) {
            return
        }
        if (desired_doc_query != null && !/[^\s]/.test(desired_doc_query)) {
            // only whitespace
            return
        }

        if (state.searched_query !== desired_doc_query) {
            fetch_docs(desired_doc_query)
        }
    }, [desired_doc_query, state.loading, state.searched_query])

    useLayoutEffect(() => {
        if (focus_on_open && live_doc_search_ref.current) {
            live_doc_search_ref.current.focus({ preventScroll: true })
            live_doc_search_ref.current.select()
        }
    }, [focus_on_open])

    let fetch_docs = (new_query) => {
        update_state((state) => {
            state.loading = true
            state.searched_query = new_query
        })
        Promise.race([
            observablehq.Promises.delay(2000, false),
            pluto_actions.send("docs", { query: new_query.replace(/^\?/, "") }, { notebook_id: notebook.notebook_id }).then((u) => {
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

    let docs_element = useMemo(
        () => html`<${RawHTMLContainer} body=${without_workspace_stuff(state.body)} sanitize_html=${sanitize_html} sanitize_html_message=${false} />`,
        [state.body, sanitize_html]
    )
    let no_docs_found = state.loading === false && state.searched_query !== "" && state.searched_query !== state.shown_query

    return html`
        <div
            class=${cl({
                "live-docs-searchbox": true,
                "loading": state.loading,
                "notfound": no_docs_found,
            })}
            translate=${false}
        >
            <input
                title=${no_docs_found ? `"${state.searched_query}" not found` : ""}
                id="live-docs-search"
                placeholder="Search docs..."
                ref=${live_doc_search_ref}
                onInput=${(e) => on_update_doc_query(e.target.value)}
                value=${desired_doc_query}
                type="search"
            ></input>
            
        </div>
        <section ref=${(ref) => ref != null && post_process_doc_node(ref, on_update_doc_query)}>
            <h1><code>${state.shown_query}</code></h1>
            ${docs_element}
        </section>
    `
}

const post_process_doc_node = (node, on_update_doc_query) => {
    // Apply syntax highlighting to code blocks:

    // In the standard HTML container we already do this for code.language-julia blocks,
    // but in the docs it's safe to extend to to all highlighting I think
    // Actually, showing the jldoctest stuff wasn't as pretty... should make a mode for that sometimes
    // for (let code_element of container_ref.current.querySelectorAll("code.language-jldoctest")) {
    //     highlight(code_element, "julia")
    // }
    for (let code_element of node.querySelectorAll("code:not([class])")) {
        highlight(code_element, "julia")
    }

    // Resolve @doc reference links:
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

const without_workspace_stuff = (str) =>
    str
        .replace(/Main\.var&quot;workspace\#\d+&quot;\./g, "") // remove workspace modules from variable names
        .replace(/Main\.workspace\#\d+\./g, "") // remove workspace modules from variable names
        .replace(/ in Main\.var&quot;workspace\#\d+&quot;/g, "") // remove workspace modules from method lists
        .replace(/ in Main\.workspace\#\d+/g, "") // remove workspace modules from method lists
        .replace(/#&#61;&#61;#[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\:\d+/g, "") // remove UUIDs from filenames
