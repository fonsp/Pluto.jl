import { html, Component, useState, useEffect } from "../imports/Preact.js"
import immer from "../imports/immer.js"

import { create_pluto_connection, resolvable_promise } from "../common/PlutoConnection.js"
import { create_counter_statistics, send_statistics_if_enabled, store_statistics_sample, finalize_statistics, init_feedback } from "../common/Feedback.js"

import { FilePicker } from "./FilePicker.js"
import { Notebook } from "./Notebook.js"
import { LiveDocs } from "./LiveDocs.js"
import { DropRuler } from "./DropRuler.js"
import { SelectionArea } from "./SelectionArea.js"
import { UndoDelete } from "./UndoDelete.js"
import { SlideControls } from "./SlideControls.js"
import { Scroller } from "./Scroller.js"

import { link_open_path } from "./Welcome.js"
import { empty_cell_data, code_differs } from "./Cell.js"

import { offline_html } from "../common/OfflineHTMLExport.js"
import { slice_utf8, length_utf8 } from "../common/UnicodeTools.js"
import { has_ctrl_or_cmd_pressed, ctrl_or_cmd_name, is_mac_keyboard, in_textarea_or_input } from "../common/KeyboardShortcuts.js"
import { handle_log } from "../common/Logging.js"

const default_path = "..."

/**
 * Serialize an array of cells into a string form (similar to the .jl file).
 *
 * Used for implementing clipboard functionality. This isn't in topological
 * order, so you won't necessarily be able to run it directly.
 *
 * @param {Array<import("./Cell.js").CellState>} cells
 * @return {String}
 */
function serialize_cells(cells) {
    return cells.map((cell) => `# ╔═╡ ${cell.cell_id}\n` + cell.local_code.body + "\n").join("\n")
}

/**
 * Deserialize a Julia program or output from `serialize_cells`.
 *
 * If a Julia program, it will return a single String containing it. Otherwise,
 * it will split the string into cells based on the special delimiter.
 *
 * @param {String} serialized_cells
 * @return {Array<String>}
 */
function deserialize_cells(serialized_cells) {
    const segments = serialized_cells.replace(/\r\n/g, "\n").split(/# ╔═╡ \S+\n/)
    return segments.map((s) => s.trim()).filter((s) => s.length > 0)
}

const Circle = ({ fill }) => html`
    <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        style="
            height: .7em;
            width: .7em;
            margin-left: .3em;
            margin-right: .2em;
        "
    >
        <circle cx="24" cy="24" r="24" fill=${fill}></circle>
    </svg>
`
const Triangle = ({ fill }) => html`
    <svg width="48" height="48" viewBox="0 0 48 48" style="height: .7em; width: .7em; margin-left: .3em; margin-right: .2em; margin-bottom: -.1em;">
        <polygon points="24,0 48,40 0,40" fill=${fill} stroke="none" />
    </svg>
`

let ExportBanner = ({ notebook, pluto_version, onClose, open }) => {
    // let [html_export, set_html_export] = useState(null)

    // useEffect(() => {
    //     if (open) {
    //         offline_html({
    //             pluto_version: pluto_version,
    //             head: document.head,
    //             body: document.body,
    //         }).then((html) => {
    //             set_html_export(html)
    //         })
    //     } else {
    //         set_html_export(null)
    //     }
    // }, [notebook, open, set_html_export])

    return html`
        <aside id="export">
            <div id="container">
                <div class="export_title">export</div>
                <a href="./notebookfile?id=${notebook.notebook_id}" target="_blank" class="export_card">
                    <header><${Triangle} fill="#a270ba" /> Notebook file</header>
                    <section>Download a copy of the <b>.jl</b> script.</section>
                </a>
                <a
                    href="#"
                    class="export_card"
                    onClick=${(e) => {
                        offline_html({
                            pluto_version: pluto_version,
                            head: document.head,
                            body: document.body,
                        }).then((html) => {
                            if (html != null) {
                                const fake_anchor = document.createElement("a")
                                fake_anchor.download = `${notebook.shortpath}.html`
                                fake_anchor.href = URL.createObjectURL(
                                    new Blob([html], {
                                        type: "text/html",
                                    })
                                )
                                document.body.appendChild(fake_anchor)
                                fake_anchor.click()
                                document.body.removeChild(fake_anchor)
                            }
                        })
                    }}
                >
                    <header><${Circle} fill="#E86F51" /> Static HTML</header>
                    <section>An <b>.html</b> file for your web page, or to share online.</section>
                </a>
                <a
                    href="#"
                    class="export_card"
                    style=${window.chrome == null ? "opacity: .7;" : ""}
                    onClick=${() => {
                        if (window.chrome == null) {
                            alert("PDF generation works best on Google Chome.\n\n(We're working on it!)")
                        }
                        window.print()
                    }}
                >
                    <header><${Circle} fill="#3D6117" /> Static PDF</header>
                    <section>A static <b>.pdf</b> file for print or email.</section>
                </a>
                <!--<div class="export_title">
                    future
                </div>
                <a class="export_card" style="border-color: #00000021; opacity: .7;">
                    <header>mybinder.org</header>
                    <section>Publish an interactive notebook online.</section>
                </a>-->
                <button title="Close" class="toggle_export" onClick=${() => onClose()}>
                    <span></span>
                </button>
            </div>
        </aside>
    `
}

export class Editor extends Component {
    constructor() {
        super()

        this.state = {
            notebook: {
                path: default_path,
                shortpath: "",
                in_temp_dir: true,
                notebook_id: new URLSearchParams(window.location.search).get("id"),
                cells: [],
            },
            desired_doc_query: null,
            recently_deleted: null,
            connected: false,
            loading: true,
            scroller: {
                up: false,
                down: false,
            },
            export_menu_open: false,
        }
        // convenience method
        const set_notebook_state = (updater) => {
            return new Promise((resolve) => {
                this.setState((prevstate) => {
                    return {
                        notebook: {
                            ...prevstate.notebook,
                            ...updater(prevstate.notebook),
                        },
                    }
                }, resolve)
            })
        }
        this.set_notebook_state = set_notebook_state.bind(this)

        // convenience method
        const set_cell_state = (cell_id, new_state_props) => {
            return new Promise((resolve) => {
                this.setState((prevstate) => {
                    return {
                        notebook: {
                            ...prevstate.notebook,
                            cells: prevstate.notebook.cells.map((c) => {
                                return c.cell_id == cell_id ? { ...c, ...new_state_props } : c
                            }),
                        },
                    }
                }, resolve)
            })
        }
        this.set_cell_state = set_cell_state.bind(this)

        // bonds only send their latest value to the back-end when all cells have completed - this is triggered using a promise
        this.all_completed = true
        this.all_completed_promise = resolvable_promise()

        // statistics that are accumulated over time
        this.counter_statistics = create_counter_statistics()

        // these are things that can be done to the local notebook
        this.actions = {
            set_scroller: (enabled) => {
                this.setState({ scroller: enabled })
            },
            serialize_selected: (cell) => {
                const selected = cell ? this.selected_friends(cell.id) : this.state.notebook.cells.filter((c) => c.selected)
                if (selected.length) {
                    return serialize_cells(selected)
                }
            },
            add_deserialized_cells: async (data, index) => {
                const new_code = deserialize_cells(data)
                if (index === -1) index = this.state.notebook.cells.length
                for (const new_block of new_code) {
                    const update = await this.requests.add_remote_cell_at(index++, true)
                    const new_cell = empty_cell_data(update.cell_id)
                    new_cell.pasted = true
                    new_cell.queued = new_cell.running = false
                    new_cell.output.body = ""
                    new_cell.local_code.body = new_block
                    new_cell.remote_code.submitted_by_me = true
                    new_cell.selected = true
                    this.actions.add_local_cell(new_cell, update.message.index)
                }
            },
            add_local_cell: (cell, new_index) => {
                return set_notebook_state((prevstate) => {
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
            update_local_cell_output: (cell, { output, queued, running, runtime, errored }) => {
                this.counter_statistics.numRuns++
                return set_cell_state(cell.cell_id, {
                    queued: queued,
                    running: running,
                    runtime: runtime,
                    errored: errored,
                    output: output,
                })
            },
            update_local_cell_input: (cell, by_me, code, folded) => {
                return set_cell_state(cell.cell_id, {
                    remote_code: {
                        body: code,
                        submitted_by_me: by_me,
                        timestamp: Date.now(),
                    },
                    local_code: {
                        body: code,
                    },
                    code_folded: folded,
                })
            },
            delete_local_cell: (cell) => {
                // TODO: event listeners? gc?
                return set_notebook_state((prevstate) => {
                    return {
                        cells: prevstate.cells.filter((c) => c !== cell),
                    }
                })
            },
            move_local_cells: (cells, new_index) => {
                return set_notebook_state((prevstate) => {
                    // The set of moved cell can be scatter across the notebook (not necessarily contiguous)
                    // but this action will move all of them to a single cluster
                    // The first cell of that cluster will be at index `new_index`.
                    const old_first_index = prevstate.cells.findIndex((c) => cells.includes(c))

                    const before = prevstate.cells.filter((c, i) => i < new_index && !cells.includes(c))
                    const after = prevstate.cells.filter((c, i) => i >= new_index && !cells.includes(c))

                    return {
                        cells: [...before, ...cells, ...after],
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
                        case "cell_queued":
                            if (cell != null) {
                                set_cell_state(update.cell_id, {
                                    running: false,
                                    queued: true,
                                })
                            }
                            break
                        case "cell_running":
                            if (cell != null) {
                                set_cell_state(update.cell_id, {
                                    running: true,
                                    queued: false,
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
                        case "cells_moved":
                            const cells = message.cells.map((cell_id) => this.state.notebook.cells.find((c) => c.cell_id == cell_id))
                            this.actions.move_local_cells(cells, message.index)
                            break
                        case "cell_added":
                            const new_cell = empty_cell_data(update.cell_id)
                            new_cell.queued = new_cell.running = false
                            new_cell.output.body = ""
                            this.actions.add_local_cell(new_cell, message.index)
                            break
                        case "bond_update":
                            // by someone else
                            break
                        case "log":
                            handle_log(message, this.state.notebook.path)
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
        this.on_update = on_update

        const on_establish_connection = (client) => {
            // nasty
            Object.assign(this.client, client)
            window.version_info = this.client.version_info // for debugging

            const run_all = this.client.session_options.evaluation.run_notebook_on_load
            // on socket success
            this.client.send("get_all_notebooks", {}, {}).then(on_remote_notebooks)

            this.client
                .send("get_all_cells", {}, { notebook_id: this.state.notebook.notebook_id })
                .then((update) => {
                    this.setState(
                        {
                            notebook: {
                                ...this.state.notebook,
                                cells: update.message.cells.map((cell) => {
                                    const cell_data = empty_cell_data(cell.cell_id)
                                    cell_data.running = false
                                    cell_data.queued = run_all
                                    cell_data.code_folded = true
                                    return cell_data
                                }),
                            },
                        },
                        () => {
                            // For cell outputs, we request them all, and then batch all responses into one using Promise.all
                            // We could experiment with loading the first ~5 cell outputs in the first batch, and the rest in a second, to speed up the time-to-first-usable-content.
                            const outputs_promise = Promise.all(
                                this.state.notebook.cells.map((cell_data) => {
                                    return this.client.send(
                                        "get_output",
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
                                    if (!run_all || cell_data.running || cell_data.queued) {
                                        this.actions.update_local_cell_output(cell_data, u.message)
                                    } else {
                                        // the cell completed running asynchronously, after Pluto received and processed the :getouput request, but before this message was added to this client's queue.
                                    }
                                })
                            })

                            // Same for cell inputs
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

                            Promise.all([outputs_promise, inputs_promise]).then(() => {
                                this.setState({
                                    loading: false,
                                })
                                console.info("All cells loaded! 🚂 enjoy the ride")
                                // do one autocomplete to trigger its precompilation
                                this.client.send(
                                    "complete",
                                    {
                                        query: "sq",
                                    },
                                    {
                                        notebook_id: this.state.notebook.notebook_id,
                                    }
                                )
                            })
                        }
                    )
                })
                .catch(console.error)
        }

        const on_connection_status = (val) => this.setState({ connected: val })

        const on_reconnect = () => {
            console.warn("Reconnected! Checking states")

            return true
        }

        this.client = {}
        create_pluto_connection({
            on_unrequested_update: on_update,
            on_connection_status: on_connection_status,
            on_reconnect: on_reconnect,
            connect_metadata: { notebook_id: this.state.notebook.notebook_id },
        }).then(on_establish_connection)

        // these are things that can be done to the remote notebook
        this.requests = {
            change_remote_cell: (cell_id, new_code, create_promise = false) => {
                this.counter_statistics.numEvals++
                // set_cell_state(cell_id, { running: true })
                return this.client.send(
                    "change_cell",
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
                this.actions.update_local_cell_input(cell, false, new_code, cell.code_folded)
                this.requests.change_remote_cell(cell_id, new_code)
            },
            split_remote_cell: async (cell_id, boundaries, submit = false) => {
                const index = this.state.notebook.cells.findIndex((c) => c.cell_id == cell_id)
                const cell = this.state.notebook.cells[index]

                const old_code = cell.local_code.body
                const padded_boundaries = [0, ...boundaries]
                const parts = boundaries.map((b, i) => slice_utf8(old_code, padded_boundaries[i], b).trim()).filter((x) => x !== "")

                const new_ids = []

                // for loop because we need to wait for each addition to finish before adding the next, otherwise their order would be random
                for (const [i, part] of parts.entries()) {
                    if (i === 0) {
                        new_ids.push(cell_id)
                    } else {
                        const update = await this.requests.add_remote_cell_at(index + i, true)
                        on_update(update, true)
                        new_ids.push(update.cell_id)
                    }
                }

                await Promise.all(
                    parts.map(async (part, i) => {
                        const id = new_ids[i]

                        // we set the cell's remote_code to force its value
                        await this.actions.update_local_cell_input({ cell_id: id }, false, part, false)

                        // we need to reset the remote_code, otherwise the cell will falsely report that it is in sync with the remote
                        const new_state = this.state.notebook.cells.find((c) => c.cell_id === id)
                        await this.set_cell_state(id, {
                            remote_code: {
                                ...new_state.remote_code,
                                body: i === 0 ? old_code : "",
                            },
                        })
                    })
                )

                if (submit) {
                    const cells = new_ids.map((id) => this.state.notebook.cells.find((c) => c.cell_id == id))
                    await this.requests.set_and_run_multiple(cells)
                }
            },
            interrupt_remote: (cell_id) => {
                set_notebook_state((prevstate) => {
                    return {
                        cells: prevstate.cells.map((c) => {
                            return { ...c, errored: c.errored || c.running || c.queued }
                        }),
                    }
                })
                this.client.send(
                    "interrupt_all",
                    {},
                    {
                        notebook_id: this.state.notebook.notebook_id,
                    },
                    false
                )
            },
            move_remote_cells: (cells, new_index) => {
                // Indexing works as if a new cell is added.
                // e.g. if the third cell (at js-index 2) of [0, 1, 2, 3, 4]
                // is moved to the end, that would be new js-index = 5
                this.client.send(
                    "move_multiple_cells",
                    {
                        cells: cells.map((c) => c.cell_id),
                        index: new_index,
                    },
                    {
                        notebook_id: this.state.notebook.notebook_id,
                    },
                    false
                )
            },
            add_remote_cell_at: (index, create_promise = false) => {
                return this.client.send(
                    "add_cell",
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
                const cell = this.state.notebook.cells[index]
                this.setState({
                    recently_deleted: {
                        index: index,
                        body: this.state.notebook.cells[index].local_code.body,
                    },
                })

                set_cell_state(cell_id, {
                    queued: true,
                }).then(() => {
                    this.actions.update_local_cell_input(cell, false, "", true)
                })

                this.client.send(
                    "delete_cell",
                    {},
                    {
                        notebook_id: this.state.notebook.notebook_id,
                        cell_id: cell_id,
                    },
                    false
                )
            },
            confirm_delete_multiple: (verb, cells) => {
                if (cells.length <= 1 || confirm(`${verb} ${cells.length} cells?`)) {
                    if (cells.some((f) => f.running || f.queued)) {
                        if (confirm("This cell is still running - would you like to interrupt the notebook?")) {
                            this.requests.interrupt_remote(cells[0].cell_id)
                        }
                    } else {
                        cells.forEach((f) => this.requests.delete_cell(f.cell_id))
                    }
                }
            },
            fold_remote_cell: (cell_id, newFolded) => {
                this.client.send(
                    "fold_cell",
                    { folded: newFolded },
                    {
                        notebook_id: this.state.notebook.notebook_id,
                        cell_id: cell_id,
                    },
                    false
                )
            },
            set_and_run_all_changed_remote_cells: () => {
                const changed = this.state.notebook.cells.filter((cell) => code_differs(cell))
                return this.requests.set_and_run_multiple(changed)
            },
            set_and_run_multiple: (cells) => {
                const promises = cells.map((cell) => {
                    set_cell_state(cell.cell_id, { queued: true })
                    return this.client
                        .send(
                            "set_input",
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
                            "run_multiple_cells",
                            {
                                cells: cells.map((c) => c.cell_id),
                            },
                            {
                                notebook_id: this.state.notebook.notebook_id,
                            }
                        )
                    )
                    .catch(console.error)

                return cells.length != 0
            },
            set_bond: (symbol, value, is_first_value) => {
                this.counter_statistics.numBondSets++

                if (this.all_completed) {
                    // instead of waiting for this component to update, we reset the promise right now
                    // this prevents very fast bonds from sending multiple values within the ping interval
                    this.all_completed = false
                    Object.assign(this.all_completed_promise, resolvable_promise())
                }

                this.client
                    .send(
                        "set_bond",
                        {
                            sym: symbol,
                            val: value,
                            is_first_value: is_first_value,
                        },
                        { notebook_id: this.state.notebook.notebook_id }
                    )
                    .then(({ message }) => {
                        // the back-end tells us whether any cells depend on the bound value

                        if (message.triggered_other_cells) {
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
            reshow_cell: (cell_id, object_id) => {
                this.client.send(
                    "reshow_cell",
                    {
                        object_id: object_id,
                    },
                    { notebook_id: this.state.notebook.notebook_id, cell_id: cell_id },
                    false
                )
            },
        }

        this.selected_friends = (cell_id) => {
            const cell = this.state.notebook.cells.find((c) => c.cell_id === cell_id)
            if (cell.selected) {
                return this.state.notebook.cells.filter((c) => c.selected)
            } else {
                return [cell]
            }
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
                        "move_notebook_file",
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

        this.delete_selected = (verb) => {
            const selected = this.state.notebook.cells.filter((c) => c.selected)
            if (selected.length > 0) {
                this.requests.confirm_delete_multiple(verb, selected)
                return true
            }
        }

        this.run_selected = () => {
            const selected = this.state.notebook.cells.filter((c) => c.selected)
            return this.requests.set_and_run_multiple(selected)
        }

        document.addEventListener("keydown", (e) => {
            if (e.key === "q" && has_ctrl_or_cmd_pressed(e)) {
                // This one can't be done as cmd+q on mac, because that closes chrome - Dral
                if (this.state.notebook.cells.some((c) => c.running || c.queued)) {
                    this.requests.interrupt_remote()
                }
                e.preventDefault()
            } else if (e.key === "s" && has_ctrl_or_cmd_pressed(e)) {
                const some_cells_ran = this.requests.set_and_run_all_changed_remote_cells()
                if (!some_cells_ran) {
                    // all cells were in sync allready
                    // TODO: let user know that the notebook autosaves
                }
                e.preventDefault()
            } else if (e.key === "Backspace" || e.key === "Delete") {
                if (this.delete_selected("Delete")) {
                    e.preventDefault()
                }
            } else if (e.key === "Enter" && e.shiftKey) {
                this.run_selected()
            } else if ((e.key === "?" && has_ctrl_or_cmd_pressed(e)) || e.key === "F1") {
                // On mac "cmd+shift+?" is used by chrome, so that is why this needs to be ctrl as well on mac
                // Also pressing "ctrl+shift" on mac causes the key to show up as "/", this madness
                // I hope we can find a better solution for this later - Dral
                alert(
                    `Shortcuts 🎹

    Shift+Enter:   run cell
    ${ctrl_or_cmd_name}+Enter:   run cell and add cell below
    Delete or Backspace:   delete empty cell

    PageUp or fn+Up:   select cell above
    PageDown or fn+Down:   select cell below

    ${ctrl_or_cmd_name}+Q:   interrupt notebook
    ${ctrl_or_cmd_name}+S:   submit all changes

    ${ctrl_or_cmd_name}+C:   copy selected cells
    ${ctrl_or_cmd_name}+X:   cut selected cells
    ${ctrl_or_cmd_name}+V:   paste selected cells

    The notebook file saves every time you run`
                )
                e.preventDefault()
            }
        })

        document.addEventListener("copy", (e) => {
            if (!in_textarea_or_input()) {
                const serialized = this.actions.serialize_selected()
                if (serialized) {
                    navigator.clipboard.writeText(serialized).catch((err) => {
                        alert(`Error copying cells: ${e}`)
                    })
                }
            }
        })

        // Disabled until we solve https://github.com/fonsp/Pluto.jl/issues/482
        // or we can enable it with a prompt

        // Even better would be excel style: grey out until you paste it. If you paste within the same notebook, then it is just a move.

        // document.addEventListener("cut", (e) => {
        //     if (!in_textarea_or_input()) {
        //         const serialized = this.actions.serialize_selected()
        //         if (serialized) {
        //             navigator.clipboard
        //                 .writeText(serialized)
        //                 .then(() => this.delete_selected("Cut"))
        //                 .catch((err) => {
        //                     alert(`Error cutting cells: ${e}`)
        //                 })
        //         }
        //     }
        // })

        document.addEventListener("paste", async (e) => {
            if (!in_textarea_or_input()) {
                // Deselect everything first, to clean things up
                this.setState(
                    immer((state) => {
                        for (let cell of state.notebook.cells) {
                            cell.selected = false
                        }
                    })
                )

                // Paste in the cells at the end of the notebook
                const data = e.clipboardData.getData("text/plain")
                this.actions.add_deserialized_cells(data, -1)
            }
        })

        window.addEventListener("beforeunload", (event) => {
            const first_unsaved = this.state.notebook.cells.find((cell) => code_differs(cell))
            if (first_unsaved != null) {
                window.dispatchEvent(new CustomEvent("cell_focus", { detail: { cell_id: first_unsaved.cell_id } }))
                // } else if (this.state.notebook.in_temp_dir) {
                //     window.scrollTo(0, 0)
                //     // TODO: focus file picker
            } else {
                console.warn("unloading 👉 disconnecting websocket")
                this.client.kill()
                return // and don't prevent the unload
            }
            console.log("Preventing unload")
            event.stopImmediatePropagation()
            event.preventDefault()
            event.returnValue = ""
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
        }, 20 * 1000) // 20 seconds - load feedback a little later for snappier UI
    }

    componentDidUpdate() {
        document.title = "🎈 " + this.state.notebook.shortpath + " ⚡ Pluto.jl ⚡"

        const any_code_differs = this.state.notebook.cells.some((cell) => code_differs(cell))
        document.body.classList.toggle("code_differs", any_code_differs)
        document.body.classList.toggle("loading", this.state.loading)
        if (this.state.connected) {
            document.querySelector("meta[name=theme-color]").content = "#fff"
            document.body.classList.remove("disconnected")
        } else {
            document.querySelector("meta[name=theme-color]").content = "#DEAF91"
            document.body.classList.add("disconnected")
        }

        const all_completed_now = !this.state.notebook.cells.some((cell) => cell.running || cell.queued)
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
        let { export_menu_open } = this.state
        return html`
            <${Scroller} active=${this.state.scroller} />
            <header className=${export_menu_open ? "show_export" : ""}>
                <${ExportBanner}
                    pluto_version=${this.client?.version_info?.pluto}
                    notebook=${this.state.notebook}
                    open=${export_menu_open}
                    onClose=${() => this.setState({ export_menu_open: false })}
                />
                <nav id="at_the_top">
                    <a href="./">
                        <h1><img id="logo-big" src="img/logo.svg" alt="Pluto.jl" /><img id="logo-small" src="img/favicon_unsaturated.svg" /></h1>
                    </a>
                    <${FilePicker}
                        client=${this.client}
                        value=${this.state.notebook.in_temp_dir ? "" : this.state.notebook.path}
                        on_submit=${this.submit_file_change}
                        suggest_new_file=${{
                            base: this.client.session_options == null ? "" : this.client.session_options.server.notebook_path_suggestion,
                            name: this.state.notebook.shortpath,
                        }}
                        placeholder="Save notebook..."
                        button_label=${this.state.notebook.in_temp_dir ? "Choose" : "Move"}
                    />
                    <button class="toggle_export" title="Export..." onClick=${() => this.setState({ export_menu_open: !export_menu_open })}>
                        <span></span>
                    </button>
                </nav>
            </header>
            <main>
                <preamble>
                    <button onClick=${() => this.requests.set_and_run_all_changed_remote_cells()} class="runallchanged" title="Save and run all changed cells">
                        <span></span>
                    </button>
                </preamble>
                <${Notebook}
                    is_loading=${this.state.loading}
                    ...${this.state.notebook}
                    on_update_doc_query=${(query) => this.setState({ desired_doc_query: query })}
                    on_cell_input=${(cell, new_val) => {
                        this.set_cell_state(cell.cell_id, {
                            local_code: {
                                body: new_val,
                            },
                        })
                    }}
                    on_focus_neighbor=${(cell_id, delta, line = delta === -1 ? Infinity : -1, ch) => {
                        const i = this.state.notebook.cells.findIndex((c) => c.cell_id === cell_id)
                        const new_i = i + delta
                        if (new_i >= 0 && new_i < this.state.notebook.cells.length) {
                            window.dispatchEvent(
                                new CustomEvent("cell_focus", {
                                    detail: {
                                        cell_id: this.state.notebook.cells[new_i].cell_id,
                                        line: line,
                                        ch: ch,
                                    },
                                })
                            )
                        }
                    }}
                    disable_input=${!this.state.connected}
                    focus_after_creation=${!this.state.loading}
                    all_completed_promise=${this.all_completed_promise}
                    selected_friends=${this.selected_friends}
                    requests=${this.requests}
                    client=${this.client}
                />

                <${DropRuler} requests=${this.requests} actions=${this.actions} selected_friends=${this.selected_friends} />

                <${SelectionArea}
                    actions=${this.actions}
                    cells=${this.state.notebook.cells}
                    on_selection=${(selected_cell_ids) => {
                        let current_selected_cells = this.state.notebook.cells.filter((x) => x.selected).map((x) => x.cell_id)
                        if (!_.isEqual(current_selected_cells, selected_cell_ids)) {
                            this.setState(
                                immer((state) => {
                                    for (let cell of state.notebook.cells) {
                                        cell.selected = selected_cell_ids.includes(cell.cell_id)
                                    }
                                })
                            )
                        }
                    }}
                />
            </main>
            <${LiveDocs}
                desired_doc_query=${this.state.desired_doc_query}
                on_update_doc_query=${(query) => this.setState({ desired_doc_query: query })}
                client=${this.client}
                notebook=${this.state.notebook}
            />
            <${UndoDelete}
                recently_deleted=${this.state.recently_deleted}
                on_click=${() => {
                    this.requests.add_remote_cell_at(this.state.recently_deleted.index, true).then((update) => {
                        this.on_update(update, true)
                        this.actions.update_local_cell_input({ cell_id: update.cell_id }, false, this.state.recently_deleted.body, false).then(() => {
                            this.requests.change_remote_cell(update.cell_id, this.state.recently_deleted.body)
                        })
                    })
                }}
            />
            <${SlideControls} />
            <footer>
                <div id="info">
                    <form id="feedback" action="#" method="post">
                        <a href="statistics-info">Statistics</a>
                        <a href="https://github.com/fonsp/Pluto.jl/wiki">FAQ</a>
                        <span style="flex: 1"></span>
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
