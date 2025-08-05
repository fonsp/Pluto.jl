"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDelayedTruth = exports.BottomRightPanel = exports.open_bottom_right_panel = void 0;
const Preact_js_1 = require("../imports/Preact.js");
const ClassTable_js_1 = require("../common/ClassTable.js");
const LiveDocsTab_js_1 = require("./LiveDocsTab.js");
const StatusTab_js_1 = require("./StatusTab.js");
const clock_sync_js_1 = require("../common/clock sync.js");
const Binder_js_1 = require("../common/Binder.js");
const useEventListener_js_1 = require("../common/useEventListener.js");
/**
 * @typedef PanelTabName
 * @type {"docs" | "process" | null}
 */
const open_bottom_right_panel = (/** @type {PanelTabName} */ tab) => window.dispatchEvent(new CustomEvent("open_bottom_right_panel", { detail: tab }));
exports.open_bottom_right_panel = open_bottom_right_panel;
/**
 * @param {{
 * notebook: import("./Editor.js").NotebookData,
 * desired_doc_query: string?,
 * on_update_doc_query: (query: string?) => void,
 * connected: boolean,
 * backend_launch_phase: number?,
 * backend_launch_logs: string?,
 * sanitize_html?: boolean,
 * }} props
 */
let BottomRightPanel = ({ desired_doc_query, on_update_doc_query, notebook, connected, backend_launch_phase, backend_launch_logs, sanitize_html = true, }) => {
    let container_ref = (0, Preact_js_1.useRef)();
    const focus_docs_on_open_ref = (0, Preact_js_1.useRef)(false);
    const [open_tab, set_open_tab] = (0, Preact_js_1.useState)(/** @type { PanelTabName} */ (null));
    const hidden = open_tab == null;
    // Open panel when "open_bottom_right_panel" event is triggered
    (0, useEventListener_js_1.useEventListener)(window, "open_bottom_right_panel", (/** @type {CustomEvent} */ e) => {
        console.log(e.detail);
        // https://github.com/fonsp/Pluto.jl/issues/321
        focus_docs_on_open_ref.current = false;
        set_open_tab(e.detail);
        if (window.getComputedStyle(container_ref.current).display === "none") {
            alert("This browser window is too small to show docs.\n\nMake the window bigger, or try zooming out.");
        }
    }, [set_open_tab]);
    const status = useWithBackendStatus(notebook, backend_launch_phase);
    const [status_total, status_done] = (0, Preact_js_1.useMemo)(() => status == null
        ? [0, 0]
        : [
            // total_tasks minus 1, to exclude the notebook task itself
            (0, StatusTab_js_1.total_tasks)(status) - 1,
            // the notebook task should never be done, but lets be sure and subtract 1 if it is:
            (0, StatusTab_js_1.total_done)(status) - ((0, StatusTab_js_1.is_finished)(status) ? 1 : 0),
        ], [status]);
    const busy = status_done < status_total;
    const show_business_outline = (0, exports.useDelayedTruth)(busy, 700);
    const show_business_counter = (0, exports.useDelayedTruth)(busy, 3000);
    const my_clock_is_ahead_by = (0, clock_sync_js_1.useMyClockIsAheadBy)({ connected });
    const on_popout_click = async () => {
        // Open a Picture-in-Picture window, see https://developer.chrome.com/docs/web-platform/document-picture-in-picture/
        // @ts-ignore
        const pip_window = await documentPictureInPicture.requestWindow();
        [...document.styleSheets].forEach((styleSheet) => {
            try {
                const style = document.createElement("style");
                style.textContent = [...styleSheet.cssRules].map((rule) => rule.cssText).join("");
                pip_window.document.head.appendChild(style);
            }
            catch (e) {
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.type = styleSheet.type;
                // @ts-ignore
                link.media = styleSheet.media;
                // @ts-ignore
                link.href = styleSheet.href;
                pip_window.document.head.appendChild(link);
            }
        });
        pip_window.document.body.append(container_ref.current.firstElementChild);
        pip_window.addEventListener("pagehide", (event) => {
            const pipPlayer = event.target.querySelector("pluto-helpbox");
            container_ref.current.append(pipPlayer);
        });
    };
    return (0, Preact_js_1.html) `
        <aside id="helpbox-wrapper" ref=${container_ref}>
            <pluto-helpbox class=${(0, ClassTable_js_1.cl)({ hidden, [`helpbox-${open_tab ?? hidden}`]: true })}>
                <header translate=${false}>
                    <button
                        title="Live Docs: Search for Julia documentation, and get live documentation of everything you type."
                        class=${(0, ClassTable_js_1.cl)({
        "helpbox-tab-key": true,
        "helpbox-docs": true,
        "active": open_tab === "docs",
    })}
                        onClick=${() => {
        focus_docs_on_open_ref.current = true;
        set_open_tab(open_tab === "docs" ? null : "docs");
        // TODO: focus the docs input
    }}
                    >
                        <span class="tabicon"></span>
                        <span class="tabname">Live Docs</span>
                    </button>
                    <button
                        title=${"Process status"}
                        class=${(0, ClassTable_js_1.cl)({
        "helpbox-tab-key": true,
        "helpbox-process": true,
        "active": open_tab === "process",
        "busy": show_business_outline,
        "something_is_happening": busy || !connected,
    })}
                        id="process-status-tab-button"
                        onClick=${() => {
        set_open_tab(open_tab === "process" ? null : "process");
    }}
                    >
                        <span class="tabicon"></span>
                        <span class="tabname"
                            >${open_tab === "process" || !show_business_counter
        ? "Status"
        : (0, Preact_js_1.html) `Status${" "}<span class="subprogress-counter">(${status_done}/${status_total})</span>`}</span
                        >
                    </button>

                    ${hidden
        ? null
        : (0, Preact_js_1.html) ` ${"documentPictureInPicture" in window
            ? (0, Preact_js_1.html) `<button class="helpbox-popout" title="Pop out panel" onClick=${on_popout_click}>
                                        <span></span>
                                    </button>`
            : null}
                              <button
                                  class="helpbox-close"
                                  title="Close panel"
                                  onClick=${() => {
            set_open_tab(null);
        }}
                              >
                                  <span></span>
                              </button>`}
                </header>
                ${open_tab === "docs"
        ? (0, Preact_js_1.html) `<${LiveDocsTab_js_1.LiveDocsTab}
                          focus_on_open=${focus_docs_on_open_ref.current}
                          desired_doc_query=${desired_doc_query}
                          on_update_doc_query=${on_update_doc_query}
                          notebook=${notebook}
                          sanitize_html=${sanitize_html}
                      />`
        : open_tab === "process"
            ? (0, Preact_js_1.html) `<${StatusTab_js_1.StatusTab}
                          notebook=${notebook}
                          backend_launch_logs=${backend_launch_logs}
                          my_clock_is_ahead_by=${my_clock_is_ahead_by}
                          status=${status}
                      />`
            : null}
            </pluto-helpbox>
        </aside>
    `;
};
exports.BottomRightPanel = BottomRightPanel;
const useDelayedTruth = (/** @type {boolean} */ x, /** @type {number} */ timeout) => {
    const [output, set_output] = (0, Preact_js_1.useState)(false);
    (0, Preact_js_1.useEffect)(() => {
        if (x) {
            let handle = setTimeout(() => {
                set_output(true);
            }, timeout);
            return () => clearTimeout(handle);
        }
        else {
            set_output(false);
        }
    }, [x]);
    return output;
};
exports.useDelayedTruth = useDelayedTruth;
/**
 *
 * @param {import("./Editor.js").NotebookData} notebook
 * @param {number?} backend_launch_phase
 * @returns {import("./Editor.js").StatusEntryData?}
 */
const useWithBackendStatus = (notebook, backend_launch_phase) => {
    const backend_launch = useBackendStatus(backend_launch_phase);
    return backend_launch_phase == null
        ? notebook.status_tree
        : {
            name: "notebook",
            started_at: 0,
            finished_at: null,
            subtasks: {
                ...notebook.status_tree?.subtasks,
                backend_launch,
            },
        };
};
const useBackendStatus = (/** @type {number | null} */ backend_launch_phase) => {
    let x = backend_launch_phase ?? -1;
    const subtasks = Object.fromEntries(["requesting", "created", "responded", "notebook_running"].map((key) => {
        let val = Binder_js_1.BackendLaunchPhase[key];
        let name = `backend_${key}`;
        return [name, (0, StatusTab_js_1.useStatusItem)(name, x >= val, x > val)];
    }));
    return (0, StatusTab_js_1.useStatusItem)("backend_launch", backend_launch_phase != null && backend_launch_phase > Binder_js_1.BackendLaunchPhase.wait_for_user, backend_launch_phase === Binder_js_1.BackendLaunchPhase.ready, subtasks);
};
