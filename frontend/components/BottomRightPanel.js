import { html, useState, useRef, useEffect, useMemo } from "../imports/Preact.js"
import { cl } from "../common/ClassTable.js"

import { LiveDocsTab } from "./LiveDocsTab.js"
import { is_finished, ProcessTab, total_done, total_tasks } from "./ProcessTab.js"

export const ENABLE_PROCESS_TAB = window.localStorage.getItem("ENABLE_PROCESS_TAB") === "true"

if (ENABLE_PROCESS_TAB) {
    console.log(`YOU ENABLED THE PROCESS TAB
Thanks! Awesome!
Please let us know if you find any bugs...
If enough people do this, we turn it on by default. 💛
`)
}

// Added this so we can have people test the mixed parser, because I LIKE IT SO MUCH - DRAL
// @ts-ignore
window.PLUTO_TOGGLE_PROCESS_TAB = () => {
    window.localStorage.setItem("ENABLE_PROCESS_TAB", String(!ENABLE_PROCESS_TAB))
    window.location.reload()
}

/**
 * @param {{
 * notebook: import("./Editor.js").NotebookData,
 * desired_doc_query: string?,
 * on_update_doc_query: (query: string?) => void,
 * }} props
 */
export let BottomRightPanel = ({ desired_doc_query, on_update_doc_query, notebook }) => {
    let container_ref = useRef()

    const focus_docs_on_open_ref = useRef(false)
    const [open_tab, set_open_tab] = useState(/** @type { "docs" | "process" | null} */ (null))
    const hidden = open_tab == null

    // Open docs when "open_live_docs" event is triggered
    useEffect(() => {
        let handler = () => {
            // https://github.com/fonsp/Pluto.jl/issues/321
            focus_docs_on_open_ref.current = false
            set_open_tab("docs")
            if (window.getComputedStyle(container_ref.current).display === "none") {
                alert("This browser window is too small to show docs.\n\nMake the window bigger, or try zooming out.")
            }
        }
        window.addEventListener("open_live_docs", handler)
        return () => window.removeEventListener("open_live_docs", handler)
    }, [])

    const [status_total, status_done] = useMemo(
        () =>
            !ENABLE_PROCESS_TAB || notebook.status_tree == null
                ? [0, 0]
                : [
                      // total_tasks minus 1, to exclude the notebook task itself
                      total_tasks(notebook.status_tree) - 1,
                      // the notebook task should never be done, but lets be sure and subtract 1 if it is:
                      total_done(notebook.status_tree) - (is_finished(notebook.status_tree) ? 1 : 0),
                  ],
        [notebook.status_tree]
    )

    return html`
        <aside id="helpbox-wrapper" ref=${container_ref}>
            <pluto-helpbox class=${cl({ hidden, [`helpbox-${open_tab ?? hidden}`]: true })}>
                <header translate=${false}>
                    <button
                        title="Live Docs: Search for Julia documentation, and get live documentation of everything you type."
                        class=${cl({
                            "helpbox-tab-key": true,
                            "helpbox-docs": true,
                            "active": open_tab === "docs",
                        })}
                        onClick=${() => {
                            focus_docs_on_open_ref.current = true
                            set_open_tab(open_tab === "docs" ? null : "docs")
                            // TODO: focus the docs input
                        }}
                    >
                        <span class="tabicon"></span>
                        <span class="tabname">Live Docs</span>
                    </button>
                    <button
                        disabled=${!ENABLE_PROCESS_TAB}
                        title=${ENABLE_PROCESS_TAB ? "Process status" : "We are still working on this feature. Check back soon!"}
                        class=${cl({
                            "helpbox-tab-key": true,
                            "helpbox-process": true,
                            "active": open_tab === "process",
                            "busy": status_done < status_total,
                        })}
                        onClick=${() => {
                            set_open_tab(open_tab === "process" ? null : "process")
                        }}
                    >
                        <span class="tabicon"></span>
                        <span class="tabname">${ENABLE_PROCESS_TAB ? "Status" : "Coming soon"}</span>
                    </button>
                    ${hidden
                        ? null
                        : html`<button
                              class="helpbox-close"
                              onClick=${() => {
                                  set_open_tab(null)
                              }}
                          >
                              <span></span>
                          </button>`}
                </header>
                ${open_tab === "docs"
                    ? html`<${LiveDocsTab}
                          focus_on_open=${focus_docs_on_open_ref.current}
                          desired_doc_query=${desired_doc_query}
                          on_update_doc_query=${on_update_doc_query}
                          notebook=${notebook}
                      />`
                    : open_tab === "process"
                    ? html`<${ProcessTab} notebook=${notebook} />`
                    : null}
            </pluto-helpbox>
        </aside>
    `
}
