import { html } from "../common/Html.js"
import { Component } from "https://unpkg.com/preact@10.4.4?module"

import { FilePicker } from "./FilePicker.js"
import { PlutoConnection } from "../common/PlutoConnection.js"
import { cl } from "../common/ClassTable.js"

const create_empty_notebook = (path, notebook_id = null) => {
    return {
        transitioning: false, // between running and being shut down
        notebook_id: notebook_id, // null means that it is not running
        path: path,
    }
}

const shortpath = (path) => path.split("/").pop().split("\\").pop()

export const link_open = ({ path }) => "open?path=" + encodeURIComponent(path)
export const link_edit = ({ notebook_id }) => "edit?id=" + notebook_id

export class Welcome extends Component {
    constructor() {
        super()

        this.state = {
            // running_notebooks: null,
            // recent_notebooks: null,
            combined_notebooks: null, // will become an array
            connected: false,
        }
        const set_notebook_state = (path, new_state_props) => {
            this.setState((prevstate) => {
                return {
                    combined_notebooks: prevstate.combined_notebooks.map((nb) => {
                        return nb.path == path ? { ...nb, ...new_state_props } : nb
                    }),
                }
            })
        }

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
                    let running_version = false

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
        this.client = new PlutoConnection(on_update, on_connection_status)

        this.on_open_path = (new_path) => {
            window.location.href = link_open({ path: new_path })
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
                    this.client.send("shutdownworkspace", {
                        id: nb.notebook_id,
                        remove_from_list: true,
                    })
                }
            } else {
                fetch(link_open(nb), {
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
        this.client.initialize(() => {
            this.client.sendreceive("getallnotebooks", {}).then(({ message }) => {
                const running = message.notebooks.map((nb) => create_empty_notebook(nb.path, nb.notebook_id))

                // we are going to construct the combined list:
                const combined_notebooks = [...running] // shallow copy but that's okay
                get_stored_recent_notebooks().forEach((stored) => {
                    if (!running.some((nb) => nb.path === stored.path)) {
                        // if not already in the list...
                        combined_notebooks.push(stored) // ...add it.
                    }
                })

                this.setState({ combined_notebooks: combined_notebooks })
            })

            // to start JIT'ting
            this.client.sendreceive("completepath", {
                query: "nothinginparticular",
            })

            document.body.classList.remove("loading")
        })
    }

    componentDidUpdate() {
        document.body.classList.toggle("nosessions", this.state.combined_notebooks == null || this.state.combined_notebooks.length == 0)
    }

    render() {
        let recents = null

        if (this.state.combined_notebooks == null) {
            recents = html`<li><em>Loading...</em></li>`
        } else {
            console.log(this.state.combined_notebooks)
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
                    <a href=${running ? link_edit(nb) : link_open(nb)} title=${nb.path}>${shortpath(nb.path)}</a>
                </li>`
            })
        }

        return html`<p>New session:</p>
            <ul id="new">
                <li>Open a <a href="sample">sample notebook</a></li>
                <li>Create a <a href="new">new notebook</a></li>
                <li>
                    Open from file:
                    <${FilePicker} client=${this.client} value="" on_submit=${this.on_open_path} suggest_new_file=${false} button_label="Open" />
                </li>
            </ul>
            <br />
            <p>Recent sessions:</p>
            <ul id="recent">
                ${recents}
            </ul>`
    }
}

const get_stored_recent_notebooks = () => {
    const storedString = localStorage.getItem("recent notebooks")
    const storedList = !!storedString ? JSON.parse(storedString) : []
    return storedList.map((path) => create_empty_notebook(path))
}
