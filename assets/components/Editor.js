import { html } from "../common/Html.js"
import { Component } from "https://unpkg.com/preact@10.4.4?module"

import { PlutoConnection } from "../common/PlutoConnection.js"
import { create_counter_statistics, send_statistics_if_enabled, store_statistics_sample, finalize_statistics, init_feedback } from "../common/Feedback.js"

import { FilePicker } from "./FilePicker.js"
import { Notebook } from "./Notebook.js"
import { LiveDocs } from "./LiveDocs.js"
import { DropRuler } from "./DropRuler.js"

import { link_open } from "./Welcome.js"
import { empty_cell_data, code_differs } from "./Cell.js"

export class Editor extends Component {
    constructor() {
        super()

        this.state = {
            notebook: {
                path: "...",
                notebook_id: document.location.search.split("id=")[1],
                cells: [],
            },
            desired_doc_query: null,
            connected: false,
            loading: true,
        }
        // convenience method
        const set_notebook_state = (callback) => {
            this.setState((prevstate) => {
                return {
                    notebook: {
                        ...prevstate.notebook,
                        ...callback(prevstate.notebook),
                    },
                }
            })
        }
        // convenience method
        const set_cell_state = (cell_id, new_state_props) => {
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

        // bonds only send their latest value to the back-end when all cells have completed - this is triggered using a promise
        this.all_completed = true
        this.all_completed_promise = resolvable_promise()

        // statistics that are accumulated over time
        this.counter_statistics = create_counter_statistics()

        // these are things that can be done to the local notebook
        const actions = {
            add_local_cell: (cell, new_index) => {
                set_notebook_state((prevstate) => {
                    if (prevstate.cells.some((c) => c.cell_id == cell.cell_id)) {
                        console.warn("Tried to add cell with existing cell_id. Canceled.")
                        console.log(cell)
                        console.log(prevstate)
                        return prevstate
                    }

                    const before = prevstate.cells
                    return {
                        cells: [...before.slice(0, new_index), cell, ...before.slice(new_index)],
                    }
                })
            },
            update_local_cell_output: (cell, { output, running, runtime, errored }) => {
                this.counter_statistics.numRuns++
                set_cell_state(cell.cell_id, {
                    running: running,
                    runtime: runtime,
                    errored: errored,
                    output: { ...output, timestamp: Date.now() },
                })
            },
            update_local_cell_input: (cell, by_me, code, folded) => {
                set_cell_state(cell.cell_id, {
                    remote_code: {
                        body: code,
                        submitted_by_me: by_me,
                        timestamp: Date.now(),
                    },
                    code_folded: folded,
                })
            },
            delete_local_cell: (cell) => {
                // TODO: event listeners? gc?
                set_notebook_state((prevstate) => {
                    return {
                        cells: prevstate.cells.filter((c) => c !== cell),
                    }
                })
            },
            move_local_cell: (cell, new_index) => {
                set_notebook_state((prevstate) => {
                    const old_index = prevstate.cells.findIndex((c) => c === cell)
                    if (new_index > old_index) {
                        new_index--
                    }
                    const without = prevstate.cells.filter((c) => c !== cell)
                    return {
                        cells: [...without.slice(0, new_index), cell, ...without.slice(new_index)],
                    }
                })
            },
        }

        const on_remote_notebooks = ({ message }) => {
            const old_path = this.state.notebook.path

            message.notebooks.forEach((nb) => {
                if (nb.notebook_id == this.state.notebook.notebook_id) {
                    set_notebook_state(() => nb)
                    update_stored_recent_notebooks(nb.path, old_path)
                }
            })
        }

        // these are update message that are _not_ a response to a `sendreceive`
        const on_update = (update, by_me) => {
            if (update.notebook_id == null) {
                switch (update.type) {
                    case "notebook_list":
                        on_remote_notebooks(update)
                        break
                }
            } else {
                if (this.state.notebook.notebook_id === update.notebook_id) {
                    const message = update.message
                    const cell = this.state.notebook.cells.find((c) => c.cell_id == update.cell_id)
                    switch (update.type) {
                        case "cell_output":
                            actions.update_local_cell_output(cell, message)
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
                            actions.update_local_cell_input(cell, by_me, message.code, message.folded)
                            break
                        case "cell_deleted":
                            actions.delete_local_cell(cell)
                            break
                        case "cell_moved":
                            actions.move_local_cell(cell, message.index)
                            break
                        case "cell_added":
                            const new_cell = empty_cell_data(update.cell_id)
                            new_cell.running = false
                            new_cell.output.body = ""
                            actions.add_local_cell(new_cell, message.index)
                            break
                        case "bond_update":
                            // by someone else
                            break
                        default:
                            console.error("Received unknown update type!")
                            console.log(update)
                            alert("Something went wrong 🙈\n Try clearing your browser cache and refreshing the page")
                            break
                    }
                }
            }
        }

        const on_establish_connection = () => {
            const run_all = this.client.plutoENV["PLUTO_RUN_NOTEBOOK_ON_LOAD"] == "true"
            // on socket success
            this.client.sendreceive("getallnotebooks", {}).then(on_remote_notebooks)

            this.client
                .sendreceive("getallcells", {})
                .then((update) => {
                    this.setState(
                        {
                            notebook: {
                                ...this.state.notebook,
                                cells: update.message.cells.map((cell) => {
                                    const cell_data = empty_cell_data(cell.cell_id)
                                    cell_data.running = run_all
                                    return cell_data
                                }),
                            },
                        },
                        () => {
                            const promises = []
                            this.state.notebook.cells.forEach((cell_data) => {
                                promises.push(
                                    this.client.sendreceive("getinput", {}, cell_data.cell_id).then((u) => {
                                        actions.update_local_cell_input(cell_data, false, u.message.code, u.message.folded)
                                    })
                                )
                                promises.push(
                                    this.client.sendreceive("getoutput", {}, cell_data.cell_id).then((u) => {
                                        if (!run_all || cell_data.running) {
                                            actions.update_local_cell_output(cell_data, u.message)
                                        } else {
                                            // the cell completed running asynchronously, after Pluto received and processed the :getouput request, but before this message was added to this client's queue.
                                        }
                                    })
                                )
                            })
                            Promise.all(promises).then(() => {
                                this.setState({
                                    loading: false,
                                })
                                console.info("Workspace initialized")
                            })
                        }
                    )
                })
                .catch(console.error)

            this.client.fetch_pluto_versions().then((versions) => {
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

        const on_connection_status = (val) => this.setState({ connected: val })

        this.client = new PlutoConnection(on_update, on_connection_status)

        // add me _before_ intializing client - it also attaches a listener to beforeunload
        window.addEventListener("beforeunload", (event) => {
            const first_unsaved = this.state.notebook.cells.find((cell) => code_differs(cell))
            if (first_unsaved != null) {
                console.log("preventing unload")
                window.dispatchEvent(new CustomEvent("cell_focus", { detail: { cell_id: first_unsaved.cell_id } }))
                event.stopImmediatePropagation()
                event.preventDefault()
                event.returnValue = ""
            }
        })

        // TODO: whoops
        this.client.notebook_id = this.state.notebook.notebook_id
        this.client.initialize(on_establish_connection)

        // these are things that can be done to the remote notebook
        this.requests = {
            change_remote_cell: (cell_id, new_code, create_promise = false) => {
                this.counter_statistics.numEvals++
                set_cell_state(cell_id, { running: true })
                return this.client.send("changecell", { code: new_code }, cell_id, create_promise)
            },
            wrap_remote_cell: (cell_id, block = "begin") => {
                const cell = this.state.notebook.cells.find((c) => c.cell_id == cell_id)
                const new_code = block + "\n\t" + cell.local_code.body.replace(/\n/g, "\n\t") + "\n" + "end"
                set_cell_state(cell_id, {
                    remote_code: {
                        body: new_code,
                        submitted_by_me: false,
                    },
                })
                this.requests.change_remote_cell(cell_id, new_code)
            },
            interrupt_remote: (cell_id) => {
                set_notebook_state((prevstate) => {
                    return {
                        cells: prevstate.cells.map((c) => {
                            return { ...c, errored: c.errored || c.running }
                        }),
                    }
                })
                this.client.send("interruptall", {})
            },
            move_remote_cell: (cell_id, new_index) => {
                // Indexing works as if a new cell is added.
                // e.g. if the third cell (at js-index 2) of [0, 1, 2, 3, 4]
                // is moved to the end, that would be new js-index = 5
                this.client.send("movecell", { index: new_index }, cell_id)
            },
            add_remote_cell: (cell_id, beforeOrAfter) => {
                const index = this.state.notebook.cells.findIndex((c) => c.cell_id == cell_id)
                const delta = beforeOrAfter == "before" ? 0 : 1
                this.client.send("addcell", { index: index + delta })
            },
            delete_cell: (cell_id) => {
                if (this.state.notebook.cells.length <= 1) {
                    this.requests.add_remote_cell(cell_id, "after")
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
            fold_remote_cell: (cell_id, newFolded) => {
                this.client.send("foldcell", { folded: newFolded }, cell_id)
            },
            run_all_changed_remote_cells: () => {
                const changed = this.state.notebook.cells.filter((cell) => code_differs(cell))

                // TODO: async await?
                const promises = changed.map((cell) => {
                    set_cell_state(cell.cell_id, { running: true })
                    return this.client
                        .sendreceive(
                            "setinput",
                            {
                                code: cell.local_code.body,
                            },
                            cell.cell_id
                        )
                        .then((u) => {
                            actions.update_local_cell_input(cell, true, u.message.code, u.message.folded)
                        })
                })
                Promise.all(promises)
                    .then(() => {
                        this.client.send("runmultiple", {
                            cells: changed.map((c) => c.cell_id),
                        })
                    })
                    .catch(console.error)

                return changed.length != 0
            },
            set_bond: (symbol, value) => {
                this.counter_statistics.numBondSets++

                if (this.all_completed) {
                    // instead of waiting for this component to update, we reset the promise right now
                    // this prevents very fast bonds from sending multiple values within the ping interval
                    this.all_completed = false
                    Object.assign(this.all_completed_promise, resolvable_promise())
                }

                this.client
                    .sendreceive("bond_set", {
                        sym: symbol,
                        val: value,
                    })
                    .then(({ message }) => {
                        // the back-end tells us whether any cells depend on the bound value

                        if (message.any_dependents) {
                            // there are dependent cells, those cells will start running and returning output soon
                            // when the last running cell returns its output, the all_completed_promise is resolved, and a new bond value can be sent
                        } else {
                            // there are no dependent cells, so we resolve the promise right now
                            if (!this.all_completed) {
                                this.all_completed = true
                                this.all_completed_promise.resolve()
                            }
                        }
                    })
            },
        }

        this.submit_file_change = (new_path, reset_cm_value) => {
            const old_path = this.state.notebook.path
            if (old_path === new_path) {
                return
            }
            if (confirm("Are you sure? Will move from\n\n" + old_path + "\n\nto\n\n" + new_path)) {
                this.setState({ loading: true })
                this.client
                    .sendreceive("movenotebookfile", {
                        path: new_path,
                    })
                    .then((u) => {
                        this.setState({
                            loading: false,
                        })
                        if (u.message.success) {
                            this.setState({
                                path: new_path,
                            })
                            document.activeElement.blur()
                        } else {
                            this.setState({
                                path: old_path,
                            })
                            reset_cm_value()
                            alert("Failed to move file:\n\n" + u.message.reason)
                        }
                    })
            } else {
                this.setState({
                    path: old_path,
                })
                reset_cm_value()
            }
        }

        document.addEventListener("keydown", (e) => {
            switch (e.keyCode) {
                case 81: // q
                    if (e.ctrlKey) {
                        if (this.state.notebook.cells.some((c) => c.running)) {
                            this.requests.interrupt_remote()
                        }
                        e.preventDefault()
                    }
                    break
                case 82: // r
                    if (e.ctrlKey) {
                        document.location.href = link_open(this.state.notebook)
                        e.preventDefault()
                    }
                    break
                case 83: // s
                    if (e.ctrlKey) {
                        const some_cells_ran = this.requests.run_all_changed_remote_cells()
                        if (!some_cells_ran) {
                            // all cells were in sync allready
                            // TODO: let user know that the notebook autosaves
                        }
                        e.preventDefault()
                    }
                    break
                case 191: // ? or /
                    if (!(e.ctrlKey && e.shiftKey)) {
                        break
                    }
                // fall into:
                case 112: // F1
                    // TODO: show help
                    alert(
                        `Shortcuts 🎹
        
        Ctrl+Enter:   run cell
        Shift+Enter:   run cell and add cell below
        Ctrl+Shift+Delete:   delete cell
        Ctrl+Q:   interrupt notebook
        Ctrl+S:   submit all changes`
                    )

                    e.preventDefault()
                    break
            }
        })

        setTimeout(() => {
            init_feedback()
            finalize_statistics(this.state, this.client, this.counter_statistics).then(store_statistics_sample)

            setInterval(() => {
                finalize_statistics(this.state, this.client, this.counter_statistics).then((statistics) => {
                    store_statistics_sample(statistics)
                    send_statistics_if_enabled(statistics)
                })
                this.counter_statistics = create_counter_statistics()
            }, 10 * 60 * 1000) // 10 minutes - statistics interval
        }, 5 * 1000) // 5 seconds - load feedback a little later for snappier UI
    }

    componentDidUpdate() {
        const fileName = this.state.notebook.path.split("/").pop().split("\\").pop()
        const cuteName = "🎈 " + fileName + " ⚡ Pluto.jl ⚡"
        document.title = cuteName

        const any_code_differs = this.state.notebook.cells.some((cell) => code_differs(cell))
        document.body.classList.toggle("code-differs", any_code_differs)
        document.body.classList.toggle("loading", this.state.loading)
        if (this.state.connected) {
            document.querySelector("meta[name=theme-color]").content = "#fff"
            document.body.classList.remove("disconnected")
        } else {
            document.querySelector("meta[name=theme-color]").content = "#DEAF91"
            document.body.classList.add("disconnected")
        }

        const all_completed_now = !this.state.notebook.cells.some((cell) => cell.running)
        if (all_completed_now && !this.all_completed) {
            this.all_completed = true
            this.all_completed_promise.resolve()
        }
        if (!all_completed_now && this.all_completed) {
            this.all_completed = false
            Object.assign(this.all_completed_promise, resolvable_promise())
        }
    }

    render() {
        return html`
            <header>
                <div id="logocontainer">
                    <a href="./">
                        <h1><img id="logo-big" src="assets/img/logo.svg" alt="Pluto.jl" /><img id="logo-small" src="assets/img/favicon_unsaturated.svg" /></h1>
                    </a>
                    <${FilePicker}
                        client=${this.client}
                        value=${this.state.notebook.path}
                        on_submit=${this.submit_file_change}
                        suggest_new_file=${true}
                        button_label="Rename"
                    />
                </div>
            </header>
            <main>
                <preamble>
                    <button onClick=${() => this.requests.run_all_changed_remote_cells()} class="runallchanged" title="Save and run all changed cells">
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
                    disable_input=${!this.state.connected}
                    create_focus=${!this.state.loading}
                    all_completed_promise=${this.all_completed_promise}
                    requests=${this.requests}
                    client=${this.client}
                />

                <${DropRuler} requests=${this.requests} />
            </main>
            <${LiveDocs} desired_doc_query=${this.state.desired_doc_query} client=${this.client} />
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
}

/* LOCALSTORAGE NOTEBOOKS LIST */

export const update_stored_recent_notebooks = (recent_path, also_delete = undefined) => {
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

const resolvable_promise = () => {
    let resolve
    const p = new Promise((r) => {
        resolve = r
    })
    return {
        current: p,
        resolve: resolve,
    }
}
