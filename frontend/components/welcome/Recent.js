import _ from "../../imports/lodash.js"
import { html, useEffect, useState, useRef } from "../../imports/Preact.js"
import * as preact from "../../imports/Preact.js"

import { cl } from "../../common/ClassTable.js"
import { link_edit, link_open_path } from "./Open.js"

/**
 * @typedef CombinedNotebook
 * @type {{
 *    path: String,
 *    transitioning: Boolean,
 *    notebook_id: String?,
 * }}
 */

/**
 *
 * @param {string} path
 * @param {string?} notebook_id
 * @returns {CombinedNotebook}
 */
const entry = (path, notebook_id = null) => {
    return {
        transitioning: false, // between running and being shut down
        notebook_id: notebook_id, // null means that it is not running
        path: path,
    }
}

const split_at_level = (path, level) => path.split(/\/|\\/).slice(-level).join("/")

const shortest_path = (path, allpaths) => {
    let level = 1
    for (const otherpath of allpaths) {
        if (otherpath !== path) {
            while (split_at_level(path, level) === split_at_level(otherpath, level)) {
                level++
            }
        }
    }
    return split_at_level(path, level)
}

/**
 * @param {{
 *  client: import("../../common/PlutoConnection.js").PlutoConnection?,
 *  connected: Boolean,
 *  remote_notebooks: Array<import("./Welcome.js").NotebookListEntry>,
 *  CustomRecent: preact.ReactElement?,
 * }} props
 */
export const Recent = ({ client, connected, remote_notebooks, CustomRecent }) => {
    const [combined_notebooks, set_combined_notebooks] = useState(/** @type {Array<CombinedNotebook> | null} */ (null))
    const combined_notebooks_ref = useRef(combined_notebooks)
    combined_notebooks_ref.current = combined_notebooks

    const set_notebook_state = (path, new_state_props) => {
        set_combined_notebooks((prevstate) =>
            prevstate.map((nb) => {
                return nb.path == path ? { ...nb, ...new_state_props } : nb
            })
        )
    }

    useEffect(() => {
        if (client != null && connected) {
            client.send("get_all_notebooks", {}, {}).then(({ message }) => {
                const running = /** @type {Array<import("./Welcome.js").NotebookListEntry>} */ (message.notebooks).map((nb) => entry(nb.path, nb.notebook_id))

                const recent_notebooks = get_stored_recent_notebooks()

                // show running notebooks first, in the order defined by the recent notebooks, then recent notebooks
                const combined_notebooks = [
                    ..._.sortBy(running, [(nb) => _.findIndex([...recent_notebooks, ...running], (r) => r.path === nb.path)]),
                    ..._.differenceBy(recent_notebooks, running, (nb) => nb.path),
                ]

                set_combined_notebooks(combined_notebooks)

                document.body.classList.remove("loading")
            })
        }
    }, [client != null && connected])

    useEffect(() => {
        const new_running = remote_notebooks

        if (combined_notebooks_ref.current != null) {
            // a notebook list updates happened while the welcome screen is open, because a notebook started running for example
            // the list has already been generated and rendered to the page. We try to maintain order as much as possible, to prevent the list order "jumping around" while you are interacting with it.
            // You can always get a neatly sorted list by refreshing the page.

            // already rendered notebooks will be added to this list:
            const rendered_and_running = []

            const new_combined_notebooks = combined_notebooks_ref.current.map((nb) => {
                // try to find a matching notebook in the remote list
                let running_version = null

                if (nb.notebook_id) {
                    // match notebook_ids to handle a path change
                    running_version = new_running.find((rnb) => rnb.notebook_id == nb.notebook_id)
                } else {
                    // match paths to handle a notebook bootup
                    running_version = new_running.find((rnb) => rnb.path == nb.path)
                }

                if (running_version == null) {
                    return entry(nb.path)
                } else {
                    const new_notebook = entry(running_version.path, running_version.notebook_id)
                    rendered_and_running.push(running_version)
                    return new_notebook
                }
            })

            const not_rendered_but_running = new_running.filter((rnb) => !rendered_and_running.includes(rnb)).map((rnb) => entry(rnb.path, rnb.notebook_id))

            set_combined_notebooks([...not_rendered_but_running, ...new_combined_notebooks])
        }
    }, [remote_notebooks])

    const on_session_click = (nb) => {
        if (nb.transitioning) {
            return
        }
        const running = nb.notebook_id != null
        if (running) {
            if (confirm("Shut down notebook process?")) {
                set_notebook_state(nb.path, {
                    running: false,
                    transitioning: true,
                })
                client.send("shutdown_notebook", { keep_in_session: false }, { notebook_id: nb.notebook_id }, false)
            }
        } else {
            set_notebook_state(nb.path, {
                transitioning: true,
            })
            fetch(link_open_path(nb.path), {
                method: "GET",
            })
                .then((r) => {
                    if (!r.redirected) {
                        throw new Error("file not found maybe? try opening the notebook directly")
                    }
                })
                .catch((e) => {
                    console.error("Failed to start notebook in background")
                    console.error(e)
                    set_notebook_state(nb.path, {
                        transitioning: false,
                        notebook_id: null,
                    })
                })
        }
    }

    useEffect(() => {
        document.body.classList.toggle("nosessions", !(combined_notebooks == null || combined_notebooks.length > 0))
    }, [combined_notebooks])

    /// RENDER

    const all_paths = combined_notebooks?.map((nb) => nb.path)

    let recents =
        combined_notebooks == null
            ? html`<li><em>Loading...</em></li>`
            : combined_notebooks.map((nb) => {
                  const running = nb.notebook_id != null
                  return html`<li
                      key=${nb.path}
                      class=${cl({
                          running: running,
                          recent: !running,
                          transitioning: nb.transitioning,
                      })}
                  >
                      <button onclick=${() => on_session_click(nb)} title=${running ? "Shut down notebook" : "Start notebook in background"}>
                          <span></span>
                      </button>
                      <a
                          href=${running ? link_edit(nb.notebook_id) : link_open_path(nb.path)}
                          title=${nb.path}
                          onClick=${(e) => {
                              if (!running) {
                                  document.body.classList.add("loading")
                                  set_notebook_state(nb.path, {
                                      transitioning: true,
                                  })
                              }
                          }}
                          >${shortest_path(nb.path, all_paths)}</a
                      >
                  </li>`
              })

    if (CustomRecent == null) {
        return html`
            <p>Recent sessions:</p>
            <ul id="recent">
                ${recents}
            </ul>
        `
    } else {
        return html`<${CustomRecent} cl=${cl} combined=${combined_notebooks} client=${client} recents=${recents} />`
    }
}

const get_stored_recent_notebooks = () => {
    const storedString = localStorage.getItem("recent notebooks")
    const storedData = storedString != null ? JSON.parse(storedString) : []
    const storedList = storedData instanceof Array ? storedData : []
    return storedList.map((path) => entry(path))
}
