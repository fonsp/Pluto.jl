import { h, render, Component } from "https://unpkg.com/preact@10.4.4?module"
import { useState } from "https://unpkg.com/preact@10.4.4/hooks/dist/hooks.module.js?module"
import htm from "https://unpkg.com/htm@3.0.4/dist/htm.module.js?module"

export const html = htm.bind(h)

import { FilePicker } from "./FilePicker.js"
import { Notebook } from "./Notebook.js"
import { LiveDocs } from "./LiveDocs.js"
import { PlutoConnection } from "../common/PlutoConnection.js"
import { DropRuler } from "./DropRuler.js"
import { empty_cell_data } from "./Cell.js"

export class Editor extends Component {
    constructor() {
        super()

        this.state = {
            notebook: {
                path: "unknown",
                notebook_id: document.location.search.split("id=")[1],
                cells: [],
            },
            desired_doc_query: "nothing yet",
            connected: false,
            loading: true,
        }
        const set_notebook_state = (callback) => {
            this.setState((prevstate) => {
                return {
                    notebook: {
                        ...prevstate.notebook,
                        ...callback(prevstate.Notebook),
                    },
                }
            })
        }
        const set_cell_state = (cell_id, new_state_props) => {
            // callback to ensure that things work synchronously
            this.setState((prevstate) => {
                return {
                    notebook: {
                        ...prevstate.notebook,
                        cells: prevstate.notebook.cells.map((c) => {
                            return c.cell_id == cell_id ? { ...c, ...new_state_props } : c
                        }),
                    },
                }
            })
        }
        this.set_cell_state = set_cell_state.bind(this)

        /* NOTEBOOK MODIFIERS */

        const add_local_cell = (cell, newIndex, focus = true) => {
            set_notebook_state_callback(notebook.notebook_id, (prevstate) => {
                if (prevstate.cells.any((c) => c.cell_id == cell.cell_id)) {
                    console.warn("Tried to add cell with existing cell_id. Canceled.")
                    console.log(cell)
                    console.log(notebook)
                    return
                }

                const before = prevstate.cells
                return {
                    cells: [...before.slice(0, newIndex), cell, ...before.slice(newIndex)],
                }
            })
        }

        const update_local_cell_output = (cell, output) => {
            // TODO:
            // statistics.numRuns++
            set_cell_state(cell.cell_id, output)

            // TODO
            // (see bond.js)
            // document.dispatchEvent(new CustomEvent("celloutputchanged", { detail: { cell: cellNode, mime: msg.mime } }))

            // if (!allCellsCompleted && !notebookNode.querySelector(":scope > cell.running")) {
            //     allCellsCompleted = true
            //     allCellsCompletedPromise.resolver()
            // }
        }

        const update_local_cell_input = (cell, byMe, code, folded) => {
            set_cell_state(cell.cell_id, {
                remote_code: {
                    body: code,
                    submitted_by_me: byMe,
                },
                code_folded: folded,
            })
        }

        const delete_local_cell = (cell) => {
            // TODO: event listeners? gc?
            this.setState((prevstate) => {
                return {
                    notebook: {
                        ...prevstate.notebook,
                        cells: prevstate.notebook.cells.filter((c) => c !== cell),
                    },
                }
            })
        }

        const move_local_cell = (cell, newIndex) => {
            this.setState((prevstate) => {
                const oldIndex = prevstate.notebook.cells.findIndex((c) => c === cell)
                if (newIndex > oldIndex) {
                    newIndex--
                }
                const without = prevstate.notebook.cells.filter((c) => c !== cell)
                return {
                    notebook: {
                        ...prevstate.notebook,
                        cells: [...without.slice(0, newIndex), cell, ...without.slice(newIndex)],
                    },
                }
            })
        }

        this.remote_notebooks = []

        // these are update message that are _not_ a response to a `sendreceive`
        const on_update = (update, byMe) => {
            const message = update.message
            if (update.notebook_id == null) {
                switch (update.type) {
                    case "notebook_list":
                        console.log(message.notebooks)
                        // TODO: Editor.js can sendreceive this information themself
                        // but this requires sendreceive to queue messages until it has connected
                        const old_path = this.state.notebook.path

                        this.remote_notebooks = message.notebooks
                        message.notebooks.forEach((nb) => {
                            if (nb.notebook_id == this.state.notebook.notebook_id) {
                                set_notebook_state(() => nb)
                            }
                        })

                        updateStoredRecentNotebooks(this.state.notebook.path, old_path)
                        break
                }
            } else {
                if (this.state.notebook.notebook_id !== update.notebook_id) {
                    return
                }

                const cell = this.state.notebook.cells.find((c) => c.cell_id == update.cell_id)

                switch (update.type) {
                    case "cell_output":
                        update_local_cell_output(cell, message)
                        break
                    case "cell_running":
                        set_cell_state(update.cell_id, {
                            running: true,
                        })
                        break
                    case "cell_folded":
                        set_cell_state(update.cell_id, {
                            code_folded: message.folded,
                        })
                        break
                    case "cell_input":
                        update_local_cell_input(cell, byMe, message.code, message.folded)
                        break
                    case "cell_deleted":
                        delete_local_cell(cell)
                        break
                    case "cell_moved":
                        move_local_cell(cell, message.index)
                        break
                    case "cell_added":
                        const new_cell = empty_cell_data(update.cell_id)
                        new_cell.running = false
                        new_cell.output.body = ""
                        add_local_cell(new_cell, message.index, true)
                        break
                    default:
                        console.error("Received unknown update type!")
                        console.log(update)
                        alert("Something went wrong 🙈\n Try clearing your browser cache and refreshing the page")
                        break
                }
            }
        }

        const on_establish_connection = () => {
            const runAll = this.client.plutoENV["PLUTO_RUN_NOTEBOOK_ON_LOAD"] == "true"
            // on socket success
            this.client.send("getallnotebooks", {})

            this.client
                .sendreceive("getallcells", {})
                .then((update) => {
                    this.setState(
                        {
                            notebook: {
                                ...this.state.notebook,
                                cells: update.message.cells.map((cell) => {
                                    const cell_data = empty_cell_data(cell.cell_id)
                                    cell_data.running = runAll
                                    return cell_data
                                }),
                            },
                        },
                        () => {
                            const promises = []
                            this.state.notebook.cells.forEach((cell_data) => {
                                promises.push(
                                    this.client.sendreceive("getinput", {}, cell_data.cell_id).then((u) => {
                                        update_local_cell_input(cell_data, false, u.message.code, u.message.folded)
                                    })
                                )
                                promises.push(
                                    this.client.sendreceive("getoutput", {}, cell_data.cell_id).then((u) => {
                                        if (!runAll || cell_data.running) {
                                            update_local_cell_output(cell_data, u.message)
                                        } else {
                                            // the cell completed running asynchronously, after Pluto received and processed the :getouput request, but before this message was added to this client's queue.
                                        }
                                    })
                                )
                            })

                            Promise.all(promises).then(() => {
                                // TODO: more reacty
                                this.setState({
                                    loading: false,
                                })
                                console.info("Workspace initialized")
                            })
                        }
                    )
                })
                .catch(console.error)

            this.client.fetchPlutoVersions().then((versions) => {
                const remote = versions[0]
                const local = versions[1]

                console.log(local)
                if (remote != local) {
                    const rs = remote.split(".")
                    const ls = local.split(".")

                    // while we are in alpha, we also notify for patch updates.
                    if (rs[0] != ls[0] || rs[1] != ls[1] || true) {
                        alert(
                            "A new version of Pluto.jl is available! 🎉\n\n    You have " +
                                local +
                                ", the latest is " +
                                remote +
                                ".\n\nYou can update Pluto.jl using the julia package manager.\nAfterwards, exit Pluto.jl and restart julia."
                        )
                    }
                }
            })
        }

        this.client = new PlutoConnection(on_update)

        // add me _before_ intializing client - it also attaches a listener to beforeunload
        window.addEventListener("beforeunload", (event) => {
            // TODO: dit mag vast niet meer
            const first_unsaved = document.querySelector("notebook>cell.code-differs")
            if (first_unsaved) {
                console.log("preventing unload")
                codeMirrors[first_unsaved.id].focus()
                event.stopImmediatePropagation()
                event.preventDefault()
                event.returnValue = ""
            }
        })

        // TODO: whoops
        this.client.notebook_id = this.state.notebook.notebook_id
        this.client.initialize(on_establish_connection)

        this.requests = {
            change_cell: (cell_id, newCode, createPromise = false) => {
                // TODO
                // statistics.numEvals++

                set_cell_state(cell_id, { running: true })
                return this.client.send("changecell", { code: newCode }, cell_id, createPromise)
            },
            interrupt: () => {
                this.client.send("interruptall", {})
            },
            move_cell: (cell_id, newIndex) => {
                // Indexing works as if a new cell is added.
                // e.g. if the third cell (at js-index 2) of [0, 1, 2, 3, 4]
                // is moved to the end, that would be new js-index = 5
                this.client.send("movecell", { index: newIndex }, cell_id)
            },
            add_cell: (cell_id, beforeOrAfter) => {
                const index = this.state.notebook.cells.findIndex((c) => c.cell_id == cell_id)
                const delta = beforeOrAfter == "before" ? 0 : 1
                this.client.send("addcell", { index: index + delta })
            },
            delete_cell: (cell_id) => {
                if (false /* TODO: if i am the last cell */) {
                    this.requests.add_cell(cell_id, "after")
                }
                set_cell_state(cell_id, {
                    running: true,
                    remote_code: {
                        body: "",
                        submitted_by_me: false,
                    },
                })
                this.client.send("deletecell", {}, cell_id)
            },
            fold_cell: (cell_id, newFolded) => {
                this.client.send("foldcell", { folded: newFolded }, cell_id)
            },
            run_all_changed_cells: () => {
                const changed = this.state.notebook.cells.filter((c) => c.code_differs)

                // TODO: async await?
                const promises = changed.map((cell) => {
                    notebook.setCellState(cell.cell_id, { running: true })
                    return this.client
                        .sendreceive("setinput", {
                            code: cell.cm.getValue(),
                        })
                        .then((u) => {
                            update_local_cell_input(true, cellNode, u.message.code, u.message.folded)
                        })
                })
                Promise.all(promises)
                    .then(() => {
                        this.client.send("runmultiple", {
                            cells: changed.map((c) => c.id),
                        })
                    })
                    .catch(console.error)
            },
        }
    }

    componentDidUpdate() {
        const any_code_differs = this.state.notebook.cells.any((cell) => cell.code_differs)
        // TODO: meer react meer leuk
        document.body.classList.toggle("code-differs", any_code_differs)
        document.body.classList.toggle("loading", this.state.loading)
        if(this.client.currentlyConnected){
            document.querySelector("meta[name=theme-color]").content = "#fff"
            document.body.classList.remove("disconnected")
        } else {
            document.querySelector("meta[name=theme-color]").content = "#DEAF91"
            document.body.classList.add("disconnected")
        }
    }

    render() {
        const fileName = this.state.notebook.path.split("/").pop().split("\\").pop()
        const cuteName = "🎈 " + fileName + " ⚡ Pluto.jl ⚡"
        document.title = cuteName

        return html`
            <header>
                <div id="logocontainer">
                    <a href="./">
                        <h1><img id="logo-big" src="assets/img/logo.svg" alt="Pluto.jl" /><img id="logo-small" src="assets/img/favicon_unsaturated.svg" /></h1>
                    </a>
                    <${FilePicker}
                        client=${this.client}
                        remoteValue=${this.state.notebook.path}
                        onEnter=${this.submit_file_change}
                        onReset=${() => updateLocalNotebookPath(notebook.path)}
                        onBlur=${() => updateLocalNotebookPath(notebook.path)}
                        suggestNewFile=${true}
                    />
                </div>
            </header>
            <main>
                <preamble>
                    <button onClick=${() => this.remote.requestrun_all_changed_cells()} class="runallchanged" title="Save and run all changed cells">
                        <span></span>
                    </button>
                </preamble>
                <${Notebook}
                    ...${this.state.notebook}
                    on_update_doc_query=${(query) => this.setState({ desired_doc_query: query })}
                    on_cell_input=${(cell, new_val) => {
                        this.set_cell_state(cell.cell_id, {
                            local_code: {
                                body: new_val,
                            },
                        })
                    }}
                    disable_input=${!this.client.currentlyConnected}
                    requests=${this.requests}
                />

                <${DropRuler} requests=${this.requests} />
            </main>
            <${LiveDocs} desiredQuery=${this.state.desired_doc_query} client=${this.client} />
            <footer>
                <div id="info">
                    <form id="feedback" action="#" method="post">
                        <a id="statistics-info" href="statistics-info">Statistics</a>
                        <label for="opinion">🙋 How can we make <a href="https://github.com/fonsp/Pluto.jl">Pluto.jl</a> better?</label>
                        <input type="text" name="opinion" id="opinion" autocomplete="off" placeholder="Instant feedback..." />
                        <button>Send</button>
                    </form>
                </div>
            </footer>
        `
    }

    /* FILE PICKER */

    submit_file_change() {
        // TODO
        const old_path = this.state.notebook.path
        const newPath = window.filePickerCodeMirror.getValue()
        if (old_path == newPath) {
            return
        }
        if (confirm("Are you sure? Will move from\n\n" + old_path + "\n\nto\n\n" + newPath)) {
            this.setState({ loading: true })
            this.client
                .sendreceive("movenotebookfile", {
                    path: newPath,
                })
                .then((u) => {
                    this.setState({
                        loading: false,
                    })
                    if (u.message.success) {
                        this.setState({
                            path: newPath,
                        })
                        document.activeElement.blur()
                    } else {
                        this.setState({
                            path: old_path, // TODO: this doesnt set the codemirror value
                        })
                        alert("Failed to move file:\n\n" + u.message.reason)
                    }
                })
        } else {
            this.setState({
                path: old_path, // TODO: this doesnt set the codemirror value
            })
        }
    }
}

/* LOCALSTORAGE NOTEBOOKS LIST */

export function updateStoredRecentNotebooks(recent_path, also_delete = undefined) {
    const storedString = localStorage.getItem("recent notebooks")
    const storedList = !!storedString ? JSON.parse(storedString) : []
    const oldpaths = storedList
    const newpaths = [recent_path].concat(
        oldpaths.filter((path) => {
            return path != recent_path && path != also_delete
        })
    )
    localStorage.setItem("recent notebooks", JSON.stringify(newpaths.slice(0, 50)))
}
