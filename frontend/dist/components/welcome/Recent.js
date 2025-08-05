"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Recent = void 0;
const lodash_js_1 = __importDefault(require("../../imports/lodash.js"));
const Preact_js_1 = require("../../imports/Preact.js");
const preact = __importStar(require("../../imports/Preact.js"));
const ClassTable_js_1 = require("../../common/ClassTable.js");
const Open_js_1 = require("./Open.js");
const ProcessStatus_js_1 = require("../../common/ProcessStatus.js");
/**
 * @typedef CombinedNotebook
 * @type {{
 *    path: string,
 *    transitioning: Boolean,
 *    entry?: import("./Welcome.js").NotebookListEntry,
 * }}
 */
/**
 * @param {string} path
 * @returns {CombinedNotebook}
 */
const entry_notrunning = (path) => {
    return {
        transitioning: false, // between running and being shut down
        entry: undefined, // undefined means that it is not running
        path: path,
    };
};
/**
 * @param {import("./Welcome.js").NotebookListEntry} entry
 * @returns {CombinedNotebook}
 */
const entry_running = (entry) => {
    return {
        transitioning: false, // between running and being shut down
        entry,
        path: entry.path,
    };
};
const split_at_level = (path, level) => path.split(/\/|\\/).slice(-level).join("/");
const shortest_path = (path, allpaths) => {
    let level = 1;
    for (const otherpath of allpaths) {
        if (otherpath !== path) {
            while (split_at_level(path, level) === split_at_level(otherpath, level)) {
                level++;
            }
        }
    }
    return split_at_level(path, level);
};
/**
 * @param {{
 *  client: import("../../common/PlutoConnection.js").PlutoConnection?,
 *  connected: Boolean,
 *  remote_notebooks: Array<import("./Welcome.js").NotebookListEntry>,
 *  CustomRecent: preact.ReactElement?,
 *  on_start_navigation: (string) => void,
 * }} props
 */
const Recent = ({ client, connected, remote_notebooks, CustomRecent, on_start_navigation }) => {
    const [combined_notebooks, set_combined_notebooks] = (0, Preact_js_1.useState)(/** @type {Array<CombinedNotebook>?} */ (null));
    const combined_notebooks_ref = (0, Preact_js_1.useRef)(combined_notebooks);
    combined_notebooks_ref.current = combined_notebooks;
    const set_notebook_state = (path, new_state_props) => {
        set_combined_notebooks((prevstate) => prevstate?.map((nb) => {
            return nb.path == path ? { ...nb, ...new_state_props } : nb;
        }) ?? null);
    };
    (0, Preact_js_1.useEffect)(() => {
        if (client != null && connected) {
            client.send("get_all_notebooks", {}, {}).then(({ message }) => {
                const running = /** @type {Array<import("./Welcome.js").NotebookListEntry>} */ (message.notebooks).map((nb) => entry_running(nb));
                const recent_notebooks = get_stored_recent_notebooks();
                // show running notebooks first, in the order defined by the recent notebooks, then recent notebooks
                const combined_notebooks = [
                    ...lodash_js_1.default.sortBy(running, [(nb) => lodash_js_1.default.findIndex([...recent_notebooks, ...running], (r) => r.path === nb.path)]),
                    ...lodash_js_1.default.differenceBy(recent_notebooks, running, (nb) => nb.path),
                ];
                set_combined_notebooks(combined_notebooks);
                document.body.classList.remove("loading");
            });
        }
    }, [client != null && connected]);
    (0, Preact_js_1.useEffect)(() => {
        const new_running = remote_notebooks;
        if (combined_notebooks_ref.current != null) {
            // a notebook list updates happened while the welcome screen is open, because a notebook started running for example
            // the list has already been generated and rendered to the page. We try to maintain order as much as possible, to prevent the list order "jumping around" while you are interacting with it.
            // You can always get a neatly sorted list by refreshing the page.
            // already rendered notebooks will be added to this list:
            const rendered_and_running = [];
            const new_combined_notebooks = combined_notebooks_ref.current.map((nb) => {
                // try to find a matching notebook in the remote list
                let running_version = null;
                if (nb.entry != null) {
                    // match notebook_ids to handle a path change
                    running_version = new_running.find((rnb) => rnb.notebook_id === nb.entry?.notebook_id);
                }
                else {
                    // match paths to handle a notebook bootup
                    running_version = new_running.find((rnb) => rnb.path === nb.path);
                }
                if (running_version == null) {
                    return entry_notrunning(nb.path);
                }
                else {
                    const new_notebook = entry_running(running_version);
                    rendered_and_running.push(running_version);
                    return new_notebook;
                }
            });
            const not_rendered_but_running = new_running.filter((rnb) => !rendered_and_running.includes(rnb)).map(entry_running);
            set_combined_notebooks([...not_rendered_but_running, ...new_combined_notebooks]);
        }
    }, [remote_notebooks]);
    const on_session_click = (/** @type {CombinedNotebook} */ nb) => {
        if (nb.transitioning) {
            return;
        }
        const running = nb.entry != null;
        if (running) {
            if (client == null)
                return;
            if (confirm(nb.entry?.process_status === ProcessStatus_js_1.ProcessStatus.waiting_for_permission ? "Close notebook session?" : "Shut down notebook process?")) {
                set_notebook_state(nb.path, {
                    running: false,
                    transitioning: true,
                });
                client.send("shutdown_notebook", { keep_in_session: false }, { notebook_id: nb.entry?.notebook_id }, false);
            }
        }
        else {
            set_notebook_state(nb.path, {
                transitioning: true,
            });
            fetch((0, Open_js_1.link_open_path)(nb.path) + "&execution_allowed=true", {
                method: "GET",
            })
                .then((r) => {
                if (!r.redirected) {
                    throw new Error("file not found maybe? try opening the notebook directly");
                }
            })
                .catch((e) => {
                console.error("Failed to start notebook in background");
                console.error(e);
                set_notebook_state(nb.path, {
                    transitioning: false,
                    notebook_id: null,
                });
            });
        }
    };
    (0, Preact_js_1.useEffect)(() => {
        document.body.classList.toggle("nosessions", !(combined_notebooks == null || combined_notebooks.length > 0));
    }, [combined_notebooks]);
    const on_clear_click = (/** @type {CombinedNotebook} */ nb) => {
        // Remove from localStorage
        remove_notebook_from_storage(nb.path);
        // Remove from component state
        set_combined_notebooks((prevstate) => prevstate?.filter((n) => n.path !== nb.path) ?? null);
    };
    /// RENDER
    const all_paths = combined_notebooks?.map((nb) => nb.path);
    let recents = combined_notebooks == null
        ? (0, Preact_js_1.html) `<li class="not_yet_ready"><em>Loading...</em></li>`
        : combined_notebooks.map((nb) => {
            const running = nb.entry != null;
            return (0, Preact_js_1.html) `<li
                      key=${nb.path}
                      class=${(0, ClassTable_js_1.cl)({
                running: running,
                recent: !running,
                transitioning: nb.transitioning,
            })}
                  >
                      <button
                          onclick=${() => on_session_click(nb)}
                          title=${running
                ? nb.entry?.process_status === ProcessStatus_js_1.ProcessStatus.waiting_for_permission
                    ? "Stop session"
                    : "Shut down notebook"
                : "Start notebook in background"}
                      >
                          <span class="ionicon"></span>
                      </button>
                      <a
                          href=${running ? (0, Open_js_1.link_edit)(nb.entry?.notebook_id) : (0, Open_js_1.link_open_path)(nb.path)}
                          title=${nb.path}
                          onClick=${(e) => {
                if (!running) {
                    on_start_navigation(shortest_path(nb.path, all_paths));
                    set_notebook_state(nb.path, {
                        transitioning: true,
                    });
                }
            }}
                          >${shortest_path(nb.path, all_paths)}</a
                      >
                      ${!running && !nb.transitioning
                ? (0, Preact_js_1.html) `<button
                                class="clear-btn"
                                onclick=${(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    on_clear_click(nb);
                }}
                                title="Remove from recent notebooks. This does not delete the notebook file."
                                aria-label="Remove from recent notebooks"
                            >
                                FORGET
                            </button>`
                : null}
                  </li>`;
        });
    if (CustomRecent == null) {
        return (0, Preact_js_1.html) `
            <h2>My work</h2>
            <ul id="recent" class="show_scrollbar">
                <li class="new">
                    <a
                        href="new"
                        onClick=${(e) => {
            on_start_navigation("new notebook");
        }}
                        ><button><span class="ionicon"></span></button>Create a <strong>new notebook</strong></a
                    >
                </li>
                ${recents}
            </ul>
        `;
    }
    else {
        return (0, Preact_js_1.html) `<${CustomRecent} cl=${ClassTable_js_1.cl} combined=${combined_notebooks} client=${client} recents=${recents} />`;
    }
};
exports.Recent = Recent;
const get_stored_recent_notebooks = () => {
    const storedString = localStorage.getItem("recent notebooks");
    const storedData = storedString != null ? JSON.parse(storedString) : [];
    const storedList = storedData instanceof Array ? storedData : [];
    return storedList.map(entry_notrunning);
};
const remove_notebook_from_storage = (path) => {
    const stored_recent_notebooks = get_stored_recent_notebooks();
    const updated_notebooks = stored_recent_notebooks.filter((nb) => nb.path !== path);
    localStorage.setItem("recent notebooks", JSON.stringify(updated_notebooks.map((nb) => nb.path)));
};
