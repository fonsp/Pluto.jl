import { html, Component } from "../common/Preact.js"

import { PlutoConnection, resolvable_promise } from "../common/PlutoConnection.js"
import { create_counter_statistics, send_statistics_if_enabled, store_statistics_sample, finalize_statistics, init_feedback } from "../common/Feedback.js"

import { FilePicker } from "./FilePicker.js"
import { Notebook } from "./Notebook.js"
import { LiveDocs } from "./LiveDocs.js"
import { DropRuler } from "./DropRuler.js"
import { AreYouSure } from "./AreYouSure.js"
import { SlideControls } from "./SlideControls.js"

import { link_open } from "./Welcome.js"
import { empty_cell_data, code_differs } from "./Cell.js"

const default_path = "..."

export class Editor extends Component {
    constructor() {
        super()

        this.state = {
            notebook: {
                path: default_path,
                shortpath: "",
                in_temp_dir: true,
                notebook_id: document.location.search.split("id=")[1],
                cells: [],
            },
            desired_doc_query: null,
            recently_deleted: null,
            connected: false,
            loading: true,
        }
        // convenience method
        const set_notebook_state = (updater, callback) => {
            this.setState((prevstate) => {
                return {
                    notebook: {
                        ...prevstate.notebook,
                        ...updater(prevstate.notebook),
                    },
                }
            }, callback)
        }
        // convenience method
        const set_cell_state = (cell_id, new_state_props, callback) => {
            this.setState((prevstate) => {
                return {
                    notebook: {
                        ...prevstate.notebook,
                        cells: prevstate.notebook.cells.map((c) => {
                            return c.cell_id == cell_id ? { ...c, ...new_state_props } : c
                        }),
                    },
                }
            }, callback)
        }
        this.set_cell_state = set_cell_state.bind(this)

        // bonds only send their latest value to the back-end when all cells have completed - this is triggered using a promise
        this.all_completed = true
        this.all_completed_promise = resolvable_promise()

        // statistics that are accumulated over time
        this.counter_statistics = create_counter_statistics()

        // these are things that can be done to the local notebook
        this.actions = {
            add_local_cell: (cell, new_index, callback = undefined) => {
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
                }, callback)
            },
            update_local_cell_output: (cell, { output, running, runtime, errored }, callback = undefined) => {
                this.counter_statistics.numRuns++
                set_cell_state(
                    cell.cell_id,
                    {
                        running: running,
                        runtime: runtime,
                        errored: errored,
                        output: { ...output, timestamp: Date.now() },
                    },
                    callback
                )
            },
            update_local_cell_input: (cell, by_me, code, folded, callback = undefined) => {
                set_cell_state(
                    cell.cell_id,
                    {
                        remote_code: {
                            body: code,
                            submitted_by_me: by_me,
                            timestamp: Date.now(),
                        },
                        code_folded: folded,
                    },
                    callback
                )
            },
            delete_local_cell: (cell, callback = undefined) => {
                // TODO: event listeners? gc?
                set_notebook_state((prevstate) => {
                    return {
                        cells: prevstate.cells.filter((c) => c !== cell),
                    }
                }, callback)
            },
            move_local_cell: (cell, new_index, callback = undefined) => {
                set_notebook_state((prevstate) => {
                    const old_index = prevstate.cells.findIndex((c) => c === cell)
                    if (new_index > old_index) {
                        new_index--
                    }
                    const without = prevstate.cells.filter((c) => c !== cell)
                    return {
                        cells: [...without.slice(0, new_index), cell, ...without.slice(new_index)],
                    }
                }, callback)
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

        // these are update message that are _not_ a response to a `send(*, *, {create_promise: true})`
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
                            if (cell != null) {
                                this.actions.update_local_cell_output(cell, message)
                            }
                            break
                        case "cell_running":
                            if (cell != null) {
                                set_cell_state(update.cell_id, {
                                    running: true,
                                })
                            }
                            break
                        case "cell_folded":
                            if (cell != null) {
                                set_cell_state(update.cell_id, {
                                    code_folded: message.folded,
                                })
                            }
                            break
                        case "cell_input":
                            if (cell != null) {
                                this.actions.update_local_cell_input(cell, by_me, message.code, message.folded)
                            }
                            break
                        case "cell_deleted":
                            if (cell != null) {
                                this.actions.delete_local_cell(cell)
                            }
                            break
                        case "cell_moved":
                            if (cell != null) {
                                this.actions.move_local_cell(cell, message.index)
                            }
                            break
                        case "cell_added":
                            const new_cell = empty_cell_data(update.cell_id)
                            new_cell.running = false
                            new_cell.output.body = ""
                            this.actions.add_local_cell(new_cell, message.index)
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
            this.client.send("getallnotebooks", {}, {}).then(on_remote_notebooks)

            this.client
                .send("getallcells", {}, { notebook_id: this.state.notebook.notebook_id })
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
                            // For cell inputs, we request them all, and then batch all responses into one using Promise.all
                            // We process all updates in one go, so that React doesn't do its Thing™ for every cell input. (This makes page loading very slow.)
                            const inputs_promise = Promise.all(
                                this.state.notebook.cells.map((cell_data) => {
                                    return this.client.send(
                                        "getinput",
                                        {},
                                        {
                                            notebook_id: this.state.notebook.notebook_id,
                                            cell_id: cell_data.cell_id,
                                        }
                                    )
                                })
                            ).then((updates) => {
                                updates.forEach((u, i) => {
                                    const cell_data = this.state.notebook.cells[i]
                                    this.actions.update_local_cell_input(cell_data, false, u.message.code, u.message.folded)
                                })
                            })

                            // Same for cell outputs
                            // We could experiment with loading the first ~5 cell outputs in the first batch, and the rest in a second, to speed up the time-to-first-usable-content.
                            const outputs_promise = Promise.all(
                                this.state.notebook.cells.map((cell_data) => {
                                    return this.client.send(
                                        "getoutput",
                                        {},
                                        {
                                            notebook_id: this.state.notebook.notebook_id,
                                            cell_id: cell_data.cell_id,
                                        }
                                    )
                                })
                            ).then((updates) => {
                                updates.forEach((u, i) => {
                                    const cell_data = this.state.notebook.cells[i]
                                    if (!run_all || cell_data.running) {
                                        this.actions.update_local_cell_output(cell_data, u.message)
                                    } else {
                                        // the cell completed running asynchronously, after Pluto received and processed the :getouput request, but before this message was added to this client's queue.
                                    }
                                })
                            })

                            Promise.all([inputs_promise, outputs_promise]).then(() => {
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
                    const rs = remote.slice(1).split(".").map(Number)
                    const ls = local.slice(1).split(".").map(Number)

                    // if the semver can't be parsed correctly, we always show it to the user
                    if (rs.length == 3 && ls.length == 3) {
                        if (!rs.some(isNaN) && !ls.some(isNaN)) {
                            // JS orders arrays lexicographically, which is exactly what we want
                            if (rs <= ls) {
                                return
                            }
                        }
                    }
                    alert(
                        "A new version of Pluto.jl is available! 🎉\n\n    You have " +
                            local +
                            ", the latest is " +
                            remote +
                            ".\n\nYou can update Pluto.jl using the julia package manager.\nAfterwards, exit Pluto.jl and restart julia."
                    )
                }
            })
        }

        const on_connection_status = (val) => this.setState({ connected: val })

        // add me _before_ intializing client - it also attaches a listener to beforeunload
        window.addEventListener("beforeunload", (event) => {
            const first_unsaved = this.state.notebook.cells.find((cell) => code_differs(cell))
            if (first_unsaved != null) {
                window.dispatchEvent(new CustomEvent("cell_focus", { detail: { cell_id: first_unsaved.cell_id } }))
            } else if (this.state.notebook.in_temp_dir) {
                window.scrollTo(0, 0)
                // TODO: focus file picker
            } else {
                return
            }
            console.log("preventing unload")
            event.stopImmediatePropagation()
            event.preventDefault()
            event.returnValue = ""
        })

        this.client = new PlutoConnection(on_update, on_connection_status)
        this.client.initialize(on_establish_connection, { notebook_id: this.state.notebook.notebook_id })

        // these are things that can be done to the remote notebook
        this.requests = {
            change_remote_cell: (cell_id, new_code, create_promise = false) => {
                this.counter_statistics.numEvals++
                // set_cell_state(cell_id, { running: true })
                return this.client.send(
                    "changecell",
                    { code: new_code },
                    {
                        notebook_id: this.state.notebook.notebook_id,
                        cell_id: cell_id,
                    },
                    create_promise
                )
            },
            wrap_remote_cell: (cell_id, block = "begin") => {
                const cell = this.state.notebook.cells.find((c) => c.cell_id == cell_id)
                const new_code = block + "\n\t" + cell.local_code.body.replace(/\n/g, "\n\t") + "\n" + "end"
                set_cell_state(cell_id, {
                    remote_code: {
                        body: new_code,
                        submitted_by_me: false,
                        timestamp: Date.now(),
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
                this.client.send(
                    "interruptall",
                    {},
                    {
                        notebook_id: this.state.notebook.notebook_id,
                    },
                    false
                )
            },
            move_remote_cell: (cell_id, new_index) => {
                // Indexing works as if a new cell is added.
                // e.g. if the third cell (at js-index 2) of [0, 1, 2, 3, 4]
                // is moved to the end, that would be new js-index = 5
                this.client.send(
                    "movecell",
                    { index: new_index },
                    {
                        notebook_id: this.state.notebook.notebook_id,
                        cell_id: cell_id,
                    },
                    false
                )
            },
            add_remote_cell_at: (index, create_promise = false) => {
                return this.client.send(
                    "addcell",
                    { index: index },
                    {
                        notebook_id: this.state.notebook.notebook_id,
                    },
                    create_promise
                )
            },
            add_remote_cell: (cell_id, before_or_after, create_promise = false) => {
                const index = this.state.notebook.cells.findIndex((c) => c.cell_id == cell_id)
                const delta = before_or_after == "before" ? 0 : 1
                return this.requests.add_remote_cell_at(index + delta, create_promise)
            },
            delete_cell: (cell_id) => {
                if (this.state.notebook.cells.length <= 1) {
                    this.requests.add_remote_cell(cell_id, "after")
                }
                const index = this.state.notebook.cells.findIndex((c) => c.cell_id == cell_id)
                this.setState({
                    recently_deleted: {
                        index: index,
                        body: this.state.notebook.cells[index].local_code.body,
                    },
                })
                set_cell_state(cell_id, {
                    running: true,
                    remote_code: {
                        body: "",
                        submitted_by_me: false,
                    },
                })
                this.client.send(
                    "deletecell",
                    {},
                    {
                        notebook_id: this.state.notebook.notebook_id,
                        cell_id: cell_id,
                    },
                    false
                )
            },
            fold_remote_cell: (cell_id, newFolded) => {
                this.client.send(
                    "foldcell",
                    { folded: newFolded },
                    {
                        notebook_id: this.state.notebook.notebook_id,
                        cell_id: cell_id,
                    },
                    false
                )
            },
            run_all_changed_remote_cells: () => {
                const changed = this.state.notebook.cells.filter((cell) => code_differs(cell))

                // TODO: async await?
                const promises = changed.map((cell) => {
                    set_cell_state(cell.cell_id, { running: true })
                    return this.client
                        .send(
                            "setinput",
                            { code: cell.local_code.body },
                            {
                                notebook_id: this.state.notebook.notebook_id,
                                cell_id: cell.cell_id,
                            }
                        )
                        .then((u) => {
                            this.actions.update_local_cell_input(cell, true, u.message.code, u.message.folded)
                        })
                })
                Promise.all(promises)
                    .then(() =>
                        this.client.send(
                            "runmultiple",
                            {
                                cells: changed.map((c) => c.cell_id),
                            },
                            {
                                notebook_id: this.state.notebook.notebook_id,
                            }
                        )
                    )
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
                    .send(
                        "setbond",
                        {
                            sym: symbol,
                            val: value,
                        },
                        { notebook_id: this.state.notebook.notebook_id }
                    )
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
            if (this.state.in_temp_dir || confirm("Are you sure? Will move from\n\n" + old_path + "\n\nto\n\n" + new_path)) {
                this.setState({ loading: true })
                this.client
                    .send(
                        "movenotebookfile",
                        {
                            path: new_path,
                        },
                        { notebook_id: this.state.notebook.notebook_id }
                    )
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
                        if (this.state.notebook.path !== default_path) {
                            document.location.href = link_open(this.state.notebook)
                        }
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
        
        Shift+Enter:   run cell
        Ctrl+Enter:   run cell and add cell below
        Shift+Delete:   delete cell

        PageUp or fn+Up:   select cell above
        PageDown or fn+Down:   select cell below

        Ctrl+Q:   interrupt notebook
        Ctrl+S:   submit all changes
        
        The notebook file saves every time you run`
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
        document.title = "🎈 " + this.state.notebook.shortpath + " ⚡ Pluto.jl ⚡"

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
                        <h1><img id="logo-big" src="img/logo.svg" alt="Pluto.jl" /><img id="logo-small" src="img/favicon_unsaturated.svg" /></h1>
                    </a>
                    <${FilePicker}
                        client=${this.client}
                        value=${this.state.notebook.in_temp_dir ? "" : this.state.notebook.path}
                        on_submit=${this.submit_file_change}
                        suggest_new_file=${{
                            base: this.client.plutoENV == null ? "" : this.client.plutoENV["PLUTO_WORKING_DIRECTORY"],
                            name: this.state.notebook.shortpath,
                        }}
                        placeholder="Save notebook..."
                        button_label=${this.state.notebook.in_temp_dir ? "Save" : "Rename"}
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
                    on_focus_neighbor=${(cell_id, delta) => {
                        const i = this.state.notebook.cells.findIndex((c) => c.cell_id === cell_id)
                        const new_i = i + delta
                        if (new_i >= 0 && new_i < this.state.notebook.cells.length) {
                            window.dispatchEvent(
                                new CustomEvent("cell_focus", {
                                    detail: {
                                        cell_id: this.state.notebook.cells[new_i].cell_id,
                                        line: -1,
                                    },
                                })
                            )
                        }
                    }}
                    disable_input=${!this.state.connected}
                    focus_after_creation=${!this.state.loading}
                    all_completed_promise=${this.all_completed_promise}
                    requests=${this.requests}
                    client=${this.client}
                />

                <${DropRuler} requests=${this.requests} />
            </main>
            <${LiveDocs} desired_doc_query=${this.state.desired_doc_query} client=${this.client} notebook=${this.state.notebook} />
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
            <${AreYouSure}
                recently_deleted=${this.state.recently_deleted}
                on_click=${() => {
                    this.requests.add_remote_cell_at(this.state.recently_deleted.index, true).then((update) => {
                        this.client.on_update(update, true)
                        this.actions.update_local_cell_input({ cell_id: update.cell_id }, false, this.state.recently_deleted.body, false, () => {
                            this.requests.change_remote_cell(update.cell_id, this.state.recently_deleted.body)
                        })
                    })
                }}
            />
            <${SlideControls} />
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
