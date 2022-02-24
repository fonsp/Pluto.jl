import _ from "../imports/lodash.js"
import { html, Component, useEffect, useState, useMemo } from "../imports/Preact.js"
import * as preact from "../imports/Preact.js"

import { FilePicker } from "./FilePicker.js"
import { create_pluto_connection, fetch_pluto_releases } from "../common/PlutoConnection.js"
import { cl } from "../common/ClassTable.js"
import { PasteHandler } from "./PasteHandler.js"

// This is imported asynchronously - uncomment for development
// import environment from "../common/Environment.js"

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

const create_empty_notebook = (path, notebook_id = null) => {
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

// should strip characters similar to how github converts filenames into the #file-... URL hash.
// test on: https://gist.github.com/fonsp/f7d230da4f067a11ad18de15bff80470
const gist_normalizer = (str) =>
    str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[^a-z1-9]/g, "")

export const process_path_or_url = async (path_or_url) => {
    try {
        const u = new URL(path_or_url)
        if (!["http:", "https:", "ftp:", "ftps:"].includes(u.protocol)) {
            throw "Not a web URL"
        }
        if (u.host === "gist.github.com") {
            console.log("Gist URL detected")
            const parts = u.pathname.substring(1).split("/")
            const gist_id = parts[1]
            const gist = await (
                await fetch(`https://api.github.com/gists/${gist_id}`, {
                    headers: { Accept: "application/vnd.github.v3+json" },
                }).then((r) => (r.ok ? r : Promise.reject(r)))
            ).json()
            console.log(gist)
            const files = Object.values(gist.files)

            const selected = files.find((f) => gist_normalizer("#file-" + f.filename) === gist_normalizer(u.hash))
            if (selected != null) {
                return {
                    type: "url",
                    path_or_url: selected.raw_url,
                }
            }

            return {
                type: "url",
                path_or_url: files[0].raw_url,
            }
        } else if (u.host === "github.com") {
            u.searchParams.set("raw", "true")
        }
        return {
            type: "url",
            path_or_url: u.href,
        }
    } catch (ex) {
        /* Remove eventual single/double quotes from the path if they surround it, see
          https://github.com/fonsp/Pluto.jl/issues/1639 */
        if (path_or_url[path_or_url.length - 1] === '"' && path_or_url[0] === '"') {
            path_or_url = path_or_url.slice(1, -1) /* Remove first and last character */
        }
        return {
            type: "path",
            path_or_url: path_or_url,
        }
    }
}

// /open will execute a script from your hard drive, so we include a token in the URL to prevent a mean person from getting a bad file on your computer _using another hypothetical intrusion_, and executing it using Pluto
export const link_open_path = (path) => "open?" + new URLSearchParams({ path: path }).toString()
export const link_open_url = (url) => "open?" + new URLSearchParams({ url: url }).toString()
export const link_edit = (notebook_id) => "edit?id=" + notebook_id

export class Welcome extends Component {
    constructor() {
        super()

        this.state = {
            // running_notebooks: null,
            // recent_notebooks: null,
            combined_notebooks: /** @type {Array<CombinedNotebook>} */ (null), // will become an array
            connected: false,
            extended_components: {
                show_samples: true,
                CustomWelcome: null,
                Picker: {},
                Recent: ({ recents }) => html`
                    <p>Recent sessions:</p>
                    <ul id="recent">
                        ${recents}
                    </ul>
                `,
            },
        }
        const set_notebook_state = (this.set_notebook_state = (path, new_state_props) => {
            this.setState((prevstate) => {
                return {
                    combined_notebooks: prevstate.combined_notebooks.map((nb) => {
                        return nb.path == path ? { ...nb, ...new_state_props } : nb
                    }),
                }
            })
        })

        const on_update = ({ message, type }) => {
            if (type === "notebook_list") {
                // a notebook list updates happened while the welcome screen is open, because a notebook started running for example
                // the list has already been generated and rendered to the page. We try to maintain order as much as possible, to prevent the list order "jumping around" while you are interacting with it.
                // You can always get a neatly sorted list by refreshing the page.

                const new_running = message.notebooks

                // already rendered notebooks will be added to this list:
                const rendered_and_running = []

                const new_combined_notebooks = this.state.combined_notebooks.map((nb) => {
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
                        return create_empty_notebook(nb.path)
                    } else {
                        const new_notebook = create_empty_notebook(running_version.path, running_version.notebook_id)
                        rendered_and_running.push(running_version)
                        return new_notebook
                    }
                })

                const not_rendered_but_running = new_running.filter((rnb) => !rendered_and_running.includes(rnb))
                this.setState({
                    combined_notebooks: [...not_rendered_but_running, ...new_combined_notebooks],
                })
            }
        }

        const on_connection_status = (val) => this.setState({ connected: val })

        this.client = {}
        this.client_promise = create_pluto_connection({
            on_unrequested_update: on_update,
            on_connection_status: on_connection_status,
            on_reconnect: () => true,
        })
        this.client_promise.then(async (client) => {
            Object.assign(this.client, client)
            try {
                const { default: environment } = await import(this.client.session_options.server.injected_javascript_data_url)
                const { custom_welcome, custom_recent, custom_filepicker, show_samples = true } = environment({ client, editor: this, imports: { preact } })
                this.setState({
                    extended_components: {
                        ...this.state.extended_components,
                        Recent: custom_recent,
                        Welcome: custom_welcome,
                        Picker: custom_filepicker,
                        show_samples,
                    },
                })
            } catch (e) {}
            this.client.send("get_all_notebooks", {}, {}).then(({ message }) => {
                const running = message.notebooks.map((nb) => create_empty_notebook(nb.path, nb.notebook_id))
                const recent_notebooks = get_stored_recent_notebooks()

                // show running notebooks first, in the order defined by the recent notebooks, then recent notebooks
                const combined_notebooks = [
                    ..._.sortBy(running, [(nb) => _.findIndex([...recent_notebooks, ...running], (r) => r.path === nb.path)]),
                    ..._.differenceBy(recent_notebooks, running, (nb) => nb.path),
                ]

                this.setState({ combined_notebooks: combined_notebooks })

                document.body.classList.remove("loading")
            })

            fetch_pluto_releases()
                .then((releases) => {
                    const local = this.client.version_info.pluto
                    const latest = releases[releases.length - 1].tag_name
                    console.log(`Pluto version ${local}`)
                    const local_index = releases.findIndex((r) => r.tag_name === local)
                    if (local_index !== -1) {
                        const updates = releases.slice(local_index + 1)
                        const recommended_updates = updates.filter((r) => r.body.toLowerCase().includes("recommended update"))
                        if (recommended_updates.length > 0) {
                            console.log(`Newer version ${latest} is available`)
                            if (!this.client.version_info.dismiss_update_notification) {
                                alert(
                                    "A new version of Pluto.jl is available! 🎉\n\n    You have " +
                                        local +
                                        ", the latest is " +
                                        latest +
                                        '.\n\nYou can update Pluto.jl using the julia package manager:\n    import Pkg; Pkg.update("Pluto")\nAfterwards, exit Pluto.jl and restart julia.'
                                )
                            }
                        }
                    }
                })
                .catch(() => {
                    // Having this as a uncaught promise broke the frontend tests for me
                    // so I'm just swallowing the error explicitly - DRAL
                })

            // to start JIT'ting
            this.client.send(
                "completepath",
                {
                    query: "nothinginparticular",
                },
                {}
            )
        })

        this.on_open_path = async (new_path) => {
            const processed = await process_path_or_url(new_path)
            if (processed.type === "path") {
                document.body.classList.add("loading")
                window.location.href = link_open_path(processed.path_or_url)
            } else {
                if (confirm("Are you sure? This will download and run the file at\n\n" + processed.path_or_url)) {
                    document.body.classList.add("loading")
                    window.location.href = link_open_url(processed.path_or_url)
                }
            }
        }

        this.on_session_click = (nb) => {
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
                    this.client.send(
                        "shutdown_notebook",
                        {
                            keep_in_session: false,
                        },
                        {
                            notebook_id: nb.notebook_id,
                        },
                        false
                    )
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
    }

    componentDidMount() {
        this.componentDidUpdate()
    }

    componentDidUpdate() {
        document.body.classList.toggle("nosessions", !(this.state.combined_notebooks == null || this.state.combined_notebooks.length > 0))
    }

    render() {
        let recents = null
        if (this.state.combined_notebooks == null) {
            recents = html`<li><em>Loading...</em></li>`
        } else {
            const all_paths = this.state.combined_notebooks.map((nb) => nb.path)
            recents = this.state.combined_notebooks.map((nb) => {
                const running = nb.notebook_id != null
                return html`<li
                    key=${nb.path}
                    class=${cl({
                        running: running,
                        recent: !running,
                        transitioning: nb.transitioning,
                    })}
                >
                    <button onclick=${() => this.on_session_click(nb)} title=${running ? "Shut down notebook" : "Start notebook in background"}>
                        <span></span>
                    </button>
                    <a
                        href=${running ? link_edit(nb.notebook_id) : link_open_path(nb.path)}
                        title=${nb.path}
                        onClick=${(e) => {
                            document.body.classList.add("loading")
                            this.set_notebook_state(nb.path, {
                                transitioning: true,
                            })
                        }}
                        >${shortest_path(nb.path, all_paths)}</a
                    >
                </li>`
            })
        }
        const {
            show_samples,
            Recent,
            Picker: { text: open_file_label, placeholder },
        } = this.state.extended_components

        return html`<p>New session:</p>
            <${PasteHandler} />
            <ul id="new">
                ${show_samples && html`<li>Open a <a href="sample">sample notebook</a></li>`}
                <li>Create a <a href="new">new notebook</a></li>
                <li>
                    ${open_file_label || "Open from file"}:
                    <${FilePicker}
                        key=${placeholder}
                        client=${this.client}
                        value=""
                        on_submit=${this.on_open_path}
                        button_label="Open"
                        placeholder=${placeholder ?? "Enter path or URL..."}
                    />
                </li>
            </ul>
            <br />
            <${Recent} cl=${cl} combined=${this.state.combined_notebooks} client=${this.client} recents=${recents} />`
    }
}

const get_stored_recent_notebooks = () => {
    const storedString = localStorage.getItem("recent notebooks")
    const storedList = storedString != null ? JSON.parse(storedString) : []
    return storedList.map((path) => create_empty_notebook(path))
}
