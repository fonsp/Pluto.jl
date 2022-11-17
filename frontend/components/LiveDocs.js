import { html, useState, useRef, useEffect } from "../imports/Preact.js"
import { cl } from "../common/ClassTable.js"

import { LiveDocsTab } from "./LiveDocsTab.js"

export let LiveDocs = ({ desired_doc_query, on_update_doc_query, notebook }) => {
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

    return html`
        <aside id="helpbox-wrapper" ref=${container_ref}>
            <pluto-helpbox class=${cl({ hidden, [`helpbox-${open_tab ?? hidden}`]: true })}>
                <header translate=${false}>
                    <button
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
                        <span>Live Docs</span>
                    </button>
                    <button
                        class=${cl({
                            "helpbox-tab-key": true,
                            "helpbox-process": true,
                            "active": open_tab === "process",
                        })}
                        onClick=${() => {
                            set_open_tab(open_tab === "process" ? null : "process")
                        }}
                    >
                        <span>Process</span>
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
                    ? html`<section>Process TODO</section>`
                    : null}
            </pluto-helpbox>
        </aside>
    `
}
