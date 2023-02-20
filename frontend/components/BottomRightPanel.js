import { html, useState, useRef, useEffect, useMemo } from "../imports/Preact.js"
import { cl } from "../common/ClassTable.js"

import { LiveDocsTab } from "./LiveDocsTab.js"
import { is_finished, ProcessTab, total_done, total_tasks } from "./ProcessTab.js"
import { useMyClockIsAheadBy } from "../common/clock sync.js"

/**
 * @typedef PanelTabName
 * @type {"docs" | "process" | null}
 */

export const open_bottom_right_panel = (/** @type {PanelTabName} */ tab) => window.dispatchEvent(new CustomEvent("open_bottom_right_panel", { detail: tab }))

/**
 * @param {{
 * notebook: import("./Editor.js").NotebookData,
 * desired_doc_query: string?,
 * on_update_doc_query: (query: string?) => void,
 * connected: boolean,
 * }} props
 */
export let BottomRightPanel = ({ desired_doc_query, on_update_doc_query, notebook, connected }) => {
    let container_ref = useRef()

    const focus_docs_on_open_ref = useRef(false)
    const [open_tab, set_open_tab] = useState(/** @type { PanelTabName} */ (null))
    const hidden = open_tab == null

    // Open panel when "open_bottom_right_panel" event is triggered
    useEffect(() => {
        let handler = (/** @type {CustomEvent} */ e) => {
            console.log(e.detail)
            // https://github.com/fonsp/Pluto.jl/issues/321
            focus_docs_on_open_ref.current = false
            set_open_tab(e.detail)
            if (window.getComputedStyle(container_ref.current).display === "none") {
                alert("This browser window is too small to show docs.\n\nMake the window bigger, or try zooming out.")
            }
        }
        window.addEventListener("open_bottom_right_panel", handler)
        return () => window.removeEventListener("open_bottom_right_panel", handler)
    }, [])

    const [status_total, status_done] = useMemo(
        () =>
            notebook.status_tree == null
                ? [0, 0]
                : [
                      // total_tasks minus 1, to exclude the notebook task itself
                      total_tasks(notebook.status_tree) - 1,
                      // the notebook task should never be done, but lets be sure and subtract 1 if it is:
                      total_done(notebook.status_tree) - (is_finished(notebook.status_tree) ? 1 : 0),
                  ],
        [notebook.status_tree]
    )

    const busy = status_done < status_total

    const show_business_outline = useDelayedTruth(busy, 700)
    const show_business_counter = useDelayedTruth(busy, 3000)

    const my_clock_is_ahead_by = useMyClockIsAheadBy({ connected })

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
                        title=${"Process status"}
                        class=${cl({
                            "helpbox-tab-key": true,
                            "helpbox-process": true,
                            "active": open_tab === "process",
                            "busy": show_business_outline,
                        })}
                        onClick=${() => {
                            set_open_tab(open_tab === "process" ? null : "process")
                        }}
                    >
                        <span class="tabicon"></span>
                        <span class="tabname"
                            >${open_tab === "process" || !show_business_counter
                                ? "Status"
                                : html`Status${" "}<span class="subprogress-counter">(${status_done}/${status_total})</span>`}</span
                        >
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
                    ? html`<${ProcessTab} notebook=${notebook} my_clock_is_ahead_by=${my_clock_is_ahead_by} />`
                    : null}
            </pluto-helpbox>
        </aside>
    `
}

const useDelayedTruth = (/** @type {boolean} */ x, /** @type {number} */ timeout) => {
    const [output, set_output] = useState(false)

    useEffect(() => {
        if (x) {
            let handle = setTimeout(() => {
                set_output(true)
            }, timeout)
            return () => clearTimeout(handle)
        } else {
            set_output(false)
        }
    }, [x])

    return output
}
