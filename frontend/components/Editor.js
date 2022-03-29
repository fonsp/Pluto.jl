import { html, Component } from "../imports/Preact.js"
import * as preact from "../imports/Preact.js"
import immer, { applyPatches, produceWithPatches } from "../imports/immer.js"
import _ from "../imports/lodash.js"

import { empty_notebook_state, set_disable_ui_css } from "../editor.js"
import { create_pluto_connection } from "../common/PlutoConnection.js"
import { init_feedback } from "../common/Feedback.js"
import { serialize_cells, deserialize_cells, detect_deserializer } from "../common/Serialization.js"

import { FilePicker } from "./FilePicker.js"
import { Preamble } from "./Preamble.js"
import { NotebookMemo as Notebook } from "./Notebook.js"
import { LiveDocs } from "./LiveDocs.js"
import { DropRuler } from "./DropRuler.js"
import { SelectionArea } from "./SelectionArea.js"
import { UndoDelete } from "./UndoDelete.js"
import { SlideControls } from "./SlideControls.js"
import { Scroller } from "./Scroller.js"
import { ExportBanner } from "./ExportBanner.js"
import { Popup } from "./Popup.js"

import { slice_utf8, length_utf8 } from "../common/UnicodeTools.js"
import { has_ctrl_or_cmd_pressed, ctrl_or_cmd_name, is_mac_keyboard, in_textarea_or_input } from "../common/KeyboardShortcuts.js"
import { PlutoContext, PlutoBondsContext, PlutoJSInitializingContext, SetWithEmptyCallback } from "../common/PlutoContext.js"
import { start_binder, BinderPhase, count_stat } from "../common/Binder.js"
import { setup_mathjax } from "../common/SetupMathJax.js"
import { BinderButton } from "./BinderButton.js"
import { slider_server_actions, nothing_actions } from "../common/SliderServerClient.js"
import { ProgressBar } from "./ProgressBar.js"
import { IsolatedCell } from "./Cell.js"
import { RawHTMLContainer } from "./CellOutput.js"
import { RecordingPlaybackUI, RecordingUI } from "./RecordingUI.js"
import { HijackExternalLinksToOpenInNewTab } from "./HackySideStuff/HijackExternalLinksToOpenInNewTab.js"

// This is imported asynchronously - uncomment for development
// import environment from "../common/Environment.js"

export const default_path = "..."
const DEBUG_DIFFING = false

// from our friends at https://stackoverflow.com/a/2117523
// i checked it and it generates Julia-legal UUIDs and that's all we need -SNOF
const uuidv4 = () =>
    //@ts-ignore
    "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16))

/**
 * @typedef {import('../imports/immer').Patch} Patch
 * */

const Main = ({ children }) => {
    return html`<main>${children}</main>`
}

const ProcessStatus = {
    ready: "ready",
    starting: "starting",
    no_process: "no_process",
    waiting_to_restart: "waiting_to_restart",
}

/**
 * Map of status => Bool. In order of decreasing prioirty.
 */
const statusmap = (state, launch_params) => ({
    disconnected: !(state.connected || state.initializing || state.static_preview),
    loading:
        (state.binder_phase != null && BinderPhase.wait_for_user < state.binder_phase && state.binder_phase < BinderPhase.ready) ||
        state.initializing ||
        state.moving_file,
    process_restarting: state.notebook.process_status === ProcessStatus.waiting_to_restart,
    process_dead: state.notebook.process_status === ProcessStatus.no_process || state.notebook.process_status === ProcessStatus.waiting_to_restart,
    nbpkg_restart_required: state.notebook.nbpkg?.restart_required_msg != null,
    nbpkg_restart_recommended: state.notebook.nbpkg?.restart_recommended_msg != null,
    nbpkg_disabled: state.notebook.nbpkg?.enabled === false,
    static_preview: state.static_preview,
    binder: state.offer_binder || state.binder_phase != null,
    code_differs: state.notebook.cell_order.some(
        (cell_id) => state.cell_inputs_local[cell_id] != null && state.notebook.cell_inputs[cell_id].code !== state.cell_inputs_local[cell_id].code
    ),
    recording_waiting_to_start: state.recording_waiting_to_start,
    is_recording: state.is_recording,
    isolated_cell_view: launch_params.isolated_cell_ids != null && launch_params.isolated_cell_ids.length > 0,
})

const first_true_key = (obj) => {
    for (let [k, v] of Object.entries(obj)) {
        if (v) {
            return k
        }
    }
}

/**
 * @typedef CellInputData
 * @type {{
 *  cell_id: string,
 *  code: string,
 *  code_folded: boolean,
 *  metadata: {
 *    disabled: boolean
 *  },
 * }}
 */

/**
 * @typedef LogEntryData
 * @type {{
 *   level: number,
 *   msg: string,
 *   file: string,
 *   line: number,
 *   kwargs: Object,
 * }}
 */

/**
 * @typedef CellResultData
 * @type {{
 *  cell_id: string,
 *  queued: boolean,
 *  running: boolean,
 *  errored: boolean,
 *  runtime: ?number,
 *  downstream_cells_map: { string: [string]},
 *  upstream_cells_map: { string: [string]},
 *  precedence_heuristic: ?number,
 *  depends_on_disabled_cells: boolean,
 *  output: {
 *      body: string,
 *      persist_js_state: boolean,
 *      last_run_timestamp: number,
 *      mime: string,
 *      rootassignee: ?string,
 *      has_pluto_hook_features: boolean,
 *  },
 *  logs: Array<LogEntryData>,
 *  published_object_keys: [string],
 * }}
 */

/**
 * @typedef CellDependencyData
 * @type {{
 *  cell_id: string,
 *  downstream_cells_map: { [symbol: string]: Array<string>},
 *  upstream_cells_map: { [symbol: string]: Array<string>},
 *  precedence_heuristic: number,
 * }}
 */

/**
 * @typedef NotebookPkgData
 * @type {{
 *  enabled: boolean,
 *  restart_recommended_msg: string?,
 *  restart_required_msg: string?,
 *  installed_versions: { [pkg_name: string]: string },
 *  terminal_outputs: { [pkg_name: string]: string },
 *  busy_packages: string[],
 *  instantiated: boolean,
 * }}
 */

/**
 * @typedef LaunchParameters
 * @type {{
 *  notebook_id: string?,
 *  statefile: string?,
 *  notebookfile: string?,
 *  disable_ui: boolean,
 *  preamble_html: string?,
 *  isolated_cell_ids: string[]?,
 *  binder_url: string?,
 *  slider_server_url: string?,
 *  recording_url: string?,
 *  recording_audio_url: string?,
 * }}
 */

/**
 * @typedef NotebookData
 * @type {{
 *  notebook_id: string,
 *  path: string,
 *  shortpath: string,
 *  in_temp_dir: boolean,
 *  process_status: string,
 *  last_save_time: number,
 *  last_hot_reload_time: number,
 *  cell_inputs: { [uuid: string]: CellInputData },
 *  cell_results: { [uuid: string]: CellResultData },
 *  cell_dependencies: { [uuid: string]: CellDependencyData },
 *  cell_order: Array<string>,
 *  cell_execution_order: Array<string>,
 *  published_objects: { [objectid: string]: any},
 *  bonds: { [name: string]: any },
 *  nbpkg: NotebookPkgData?,
 * }}
 */

const url_logo_big = document.head.querySelector("link[rel='pluto-logo-big']").getAttribute("href")
const url_logo_small = document.head.querySelector("link[rel='pluto-logo-small']").getAttribute("href")

/**
 * @typedef EditorProps
 * @type {{launch_params: LaunchParameters,initial_notebook_state: NotebookData,}}
 * @augments Component<EditorProps,{}>
 */
export class Editor extends Component {
    constructor(/** @type {EditorProps} */ props) {
        super(props)

        const { launch_params, initial_notebook_state } = this.props

        this.state = {
            notebook: /** @type {NotebookData} */ initial_notebook_state,
            cell_inputs_local: /** @type {{ [id: string]: CellInputData }} */ ({}),
            desired_doc_query: null,
            recently_deleted: /** @type {Array<{ index: number, cell: CellInputData }>} */ (null),
            last_update_time: 0,

            disable_ui: launch_params.disable_ui,
            static_preview: launch_params.statefile != null,
            offer_binder: launch_params.notebookfile != null && launch_params.binder_url != null,
            binder_phase: null,
            binder_session_url: null,
            binder_session_token: null,
            connected: false,
            initializing: true,

            moving_file: false,
            scroller: {
                up: false,
                down: false,
            },
            export_menu_open: false,
            show_logs: true,

            last_created_cell: null,
            selected_cells: [],

            extended_components: {
                CustomHeader: null,
            },

            is_recording: false,
            recording_waiting_to_start: false,
        }

        this.setStatePromise = (fn) => new Promise((r) => this.setState(fn, r))

        // these are things that can be done to the local notebook
        this.actions = {
            get_notebook: () => this?.state?.notebook || {},
            send: (message_type, ...args) => this.client.send(message_type, ...args),
            get_published_object: (objectid) => this.state.notebook.published_objects[objectid],
            //@ts-ignore
            update_notebook: (...args) => this.update_notebook(...args),
            set_doc_query: (query) => this.setState({ desired_doc_query: query }),
            set_local_cell: (cell_id, new_val) => {
                return this.setStatePromise(
                    immer((state) => {
                        state.cell_inputs_local[cell_id] = {
                            code: new_val,
                        }
                        state.selected_cells = []
                    })
                )
            },
            focus_on_neighbor: (cell_id, delta, line = delta === -1 ? Infinity : -1, ch = 0) => {
                const i = this.state.notebook.cell_order.indexOf(cell_id)
                const new_i = i + delta
                if (new_i >= 0 && new_i < this.state.notebook.cell_order.length) {
                    window.dispatchEvent(
                        new CustomEvent("cell_focus", {
                            detail: {
                                cell_id: this.state.notebook.cell_order[new_i],
                                line: line,
                                ch: ch,
                            },
                        })
                    )
                }
            },
            add_deserialized_cells: async (data, index_or_id, deserializer = deserialize_cells) => {
                let new_codes = deserializer(data)
                /** @type {Array<CellInputData>} */
                /** Create copies of the cells with fresh ids */
                let new_cells = new_codes.map((code) => ({
                    cell_id: uuidv4(),
                    code: code,
                    code_folded: false,
                }))

                let index

                if (typeof index_or_id === "number") {
                    index = index_or_id
                } else {
                    /* if the input is not an integer, try interpreting it as a cell id */
                    index = this.state.notebook.cell_order.indexOf(index_or_id)
                    if (index !== -1) {
                        /* Make sure that the cells are pasted after the current cell */
                        index += 1
                    }
                }

                if (index === -1) {
                    index = this.state.notebook.cell_order.length
                }

                /** Update local_code. Local code doesn't force CM to update it's state
                 * (the usual flow is keyboard event -> cm -> local_code and not the opposite )
                 * See ** 1 **
                 */
                this.setState(
                    immer((state) => {
                        // Deselect everything first, to clean things up
                        state.selected_cells = []

                        for (let cell of new_cells) {
                            state.cell_inputs_local[cell.cell_id] = cell
                        }
                        state.last_created_cell = new_cells[0]?.cell_id
                    })
                )

                /**
                 * Create an empty cell in the julia-side.
                 * Code will differ, until the user clicks 'run' on the new code
                 */
                await update_notebook((notebook) => {
                    for (const cell of new_cells) {
                        notebook.cell_inputs[cell.cell_id] = {
                            ...cell,
                            // Fill the cell with empty code remotely, so it doesn't run unsafe code
                            code: "",
                            metadata: {
                                disabled: false,
                            },
                        }
                    }
                    notebook.cell_order = [
                        ...notebook.cell_order.slice(0, index),
                        ...new_cells.map((x) => x.cell_id),
                        ...notebook.cell_order.slice(index, Infinity),
                    ]
                })
            },
            wrap_remote_cell: async (cell_id, block_start = "begin", block_end = "end") => {
                const cell = this.state.notebook.cell_inputs[cell_id]
                const new_code = `${block_start}\n\t${cell.code.replace(/\n/g, "\n\t")}\n${block_end}`

                await this.setStatePromise(
                    immer((state) => {
                        state.cell_inputs_local[cell_id] = {
                            ...cell,
                            ...state.cell_inputs_local[cell_id],
                            code: new_code,
                        }
                    })
                )
                await this.actions.set_and_run_multiple([cell_id])
            },
            split_remote_cell: async (cell_id, boundaries, submit = false) => {
                const cell = this.state.notebook.cell_inputs[cell_id]

                const old_code = cell.code
                const padded_boundaries = [0, ...boundaries]
                /** @type {Array<String>} */
                const parts = boundaries.map((b, i) => slice_utf8(old_code, padded_boundaries[i], b).trim()).filter((x) => x !== "")
                /** @type {Array<CellInputData>} */
                const cells_to_add = parts.map((code) => {
                    return {
                        cell_id: uuidv4(),
                        code: code,
                        code_folded: false,
                        metadata: {
                            disabled: false,
                        },
                    }
                })

                this.setState(
                    immer((state) => {
                        for (let cell of cells_to_add) {
                            state.cell_inputs_local[cell.cell_id] = cell
                        }
                    })
                )
                await update_notebook((notebook) => {
                    // delete the old cell
                    delete notebook.cell_inputs[cell_id]

                    // add the new ones
                    for (let cell of cells_to_add) {
                        notebook.cell_inputs[cell.cell_id] = cell
                    }
                    notebook.cell_order = notebook.cell_order.flatMap((c) => {
                        if (cell_id === c) {
                            return cells_to_add.map((x) => x.cell_id)
                        } else {
                            return [c]
                        }
                    })
                })

                if (submit) {
                    await this.actions.set_and_run_multiple(cells_to_add.map((x) => x.cell_id))
                }
            },
            interrupt_remote: (cell_id) => {
                // TODO Make this cooler
                // set_notebook_state((prevstate) => {
                //     return {
                //         cells: prevstate.cells.map((c) => {
                //             return { ...c, errored: c.errored || c.running || c.queued }
                //         }),
                //     }
                // })
                this.client.send("interrupt_all", {}, { notebook_id: this.state.notebook.notebook_id }, false)
            },
            move_remote_cells: (cell_ids, new_index) => {
                update_notebook((notebook) => {
                    let before = notebook.cell_order.slice(0, new_index).filter((x) => !cell_ids.includes(x))
                    let after = notebook.cell_order.slice(new_index, Infinity).filter((x) => !cell_ids.includes(x))
                    notebook.cell_order = [...before, ...cell_ids, ...after]
                })
            },
            add_remote_cell_at: async (index, code = "") => {
                let id = uuidv4()
                this.setState({ last_created_cell: id })
                await update_notebook((notebook) => {
                    notebook.cell_inputs[id] = {
                        cell_id: id,
                        code,
                        code_folded: false,
                        metadata: { disabled: false },
                    }
                    notebook.cell_order = [...notebook.cell_order.slice(0, index), id, ...notebook.cell_order.slice(index, Infinity)]
                })
                await this.client.send("run_multiple_cells", { cells: [id] }, { notebook_id: this.state.notebook.notebook_id })
                return id
            },
            add_remote_cell: async (cell_id, before_or_after, code) => {
                const index = this.state.notebook.cell_order.indexOf(cell_id)
                const delta = before_or_after == "before" ? 0 : 1
                return await this.actions.add_remote_cell_at(index + delta, code)
            },
            confirm_delete_multiple: async (verb, cell_ids) => {
                if (cell_ids.length <= 1 || confirm(`${verb} ${cell_ids.length} cells?`)) {
                    if (cell_ids.some((cell_id) => this.state.notebook.cell_results[cell_id].running || this.state.notebook.cell_results[cell_id].queued)) {
                        if (confirm("This cell is still running - would you like to interrupt the notebook?")) {
                            this.actions.interrupt_remote(cell_ids[0])
                        }
                    } else {
                        this.setState({
                            recently_deleted: cell_ids.map((cell_id) => {
                                return {
                                    index: this.state.notebook.cell_order.indexOf(cell_id),
                                    cell: this.state.notebook.cell_inputs[cell_id],
                                }
                            }),
                            selected_cells: [],
                        })
                        await update_notebook((notebook) => {
                            for (let cell_id of cell_ids) {
                                delete notebook.cell_inputs[cell_id]
                            }
                            notebook.cell_order = notebook.cell_order.filter((cell_id) => !cell_ids.includes(cell_id))
                        })
                        await this.client.send("run_multiple_cells", { cells: [] }, { notebook_id: this.state.notebook.notebook_id })
                    }
                }
            },
            fold_remote_cells: async (cell_ids, newFolded) => {
                if (!newFolded && cell_ids.length > 0) {
                    this.setState({ last_created_cell: cell_ids[cell_ids.length - 1] })
                }
                await update_notebook((notebook) => {
                    for (let cell_id of cell_ids) {
                        notebook.cell_inputs[cell_id].code_folded = newFolded
                    }
                })
            },
            set_and_run_all_changed_remote_cells: () => {
                const changed = this.state.notebook.cell_order.filter(
                    (cell_id) =>
                        this.state.cell_inputs_local[cell_id] != null &&
                        this.state.notebook.cell_inputs[cell_id].code !== this.state.cell_inputs_local[cell_id]?.code
                )
                this.actions.set_and_run_multiple(changed)
                return changed.length > 0
            },
            set_and_run_multiple: async (cell_ids) => {
                // TODO: this function is called with an empty list sometimes, where?
                if (cell_ids.length > 0) {
                    await update_notebook((notebook) => {
                        for (let cell_id of cell_ids) {
                            if (this.state.cell_inputs_local[cell_id]) {
                                notebook.cell_inputs[cell_id].code = this.state.cell_inputs_local[cell_id].code
                            }
                        }
                    })
                    // This is a "dirty" trick, as this should actually be stored in some shared request_status => status state
                    // But for now... this is fine 😼
                    await this.setStatePromise(
                        immer((state) => {
                            for (let cell_id of cell_ids) {
                                if (state.notebook.cell_results[cell_id] != null) {
                                    state.notebook.cell_results[cell_id].queued = this.is_process_ready()
                                } else {
                                    // nothing
                                }
                            }
                        })
                    )
                    await this.client.send("run_multiple_cells", { cells: cell_ids }, { notebook_id: this.state.notebook.notebook_id })
                }
            },
            /**
             *
             * @param {string} name         | bond name
             * @param {*} value             | bond value
             */
            set_bond: async (name, value) => {
                await update_notebook((notebook) => {
                    // Wrap the bond value in an object so immer assumes it is changed
                    let new_bond = { value: value }
                    notebook.bonds[name] = new_bond
                })
            },
            reshow_cell: (cell_id, objectid, dim) => {
                this.client.send(
                    "reshow_cell",
                    {
                        objectid: objectid,
                        dim: dim,
                        cell_id: cell_id,
                    },
                    { notebook_id: this.state.notebook.notebook_id },
                    false
                )
            },
            /** This actions avoids pushing selected cells all the way down, which is too heavy to handle! */
            get_selected_cells: (cell_id, /** @type {boolean} */ allow_other_selected_cells) =>
                allow_other_selected_cells ? this.state.selected_cells : [cell_id],
            get_avaible_versions: async ({ package_name, notebook_id }) => {
                const { message } = await this.client.send("nbpkg_available_versions", { package_name: package_name }, { notebook_id: notebook_id })
                return message.versions
            },
        }

        const apply_notebook_patches = (patches, old_state = undefined, get_reverse_patches = false) =>
            new Promise((resolve) => {
                if (patches.length !== 0) {
                    let copy_of_patches,
                        reverse_of_patches = []
                    this.setState(
                        immer((state) => {
                            let new_notebook
                            try {
                                // To test this, uncomment the lines below:
                                // if (Math.random() < 0.25) {
                                //     throw new Error(`Error: [Immer] minified error nr: 15 '${patches?.[0]?.path?.join("/")}'    .`)
                                // }

                                if (get_reverse_patches) {
                                    ;[new_notebook, copy_of_patches, reverse_of_patches] = produceWithPatches(old_state ?? state.notebook, (state) => {
                                        applyPatches(state, patches)
                                    })
                                    // TODO: why was `new_notebook` not updated?
                                    // this is why the line below is also called when `get_reverse_patches === true`
                                }
                                new_notebook = applyPatches(old_state ?? state.notebook, patches)
                            } catch (exception) {
                                const failing_path = String(exception).match(".*'(.*)'.*")[1].replace(/\//gi, ".")
                                const path_value = _.get(this.state.notebook, failing_path, "Not Found")
                                console.log(String(exception).match(".*'(.*)'.*")[1].replace(/\//gi, "."), failing_path, typeof failing_path)
                                // The alert below is not catastrophic: the editor will try to recover.
                                // Deactivating to be user-friendly!
                                // alert(`Ooopsiee.`)

                                console.error(
                                    `#######################**************************########################
PlutoError: StateOutOfSync: Failed to apply patches.
Please report this: https://github.com/fonsp/Pluto.jl/issues adding the info below:
failing path: ${failing_path}
notebook previous value: ${path_value}
patch: ${JSON.stringify(
                                        patches?.find(({ path }) => path.join("") === failing_path),
                                        null,
                                        1
                                    )}
#######################**************************########################`,
                                    exception
                                )
                                console.log("Trying to recover: Refetching notebook...")
                                this.client.send(
                                    "reset_shared_state",
                                    {},
                                    {
                                        notebook_id: this.state.notebook.notebook_id,
                                    },
                                    false
                                )
                                return
                            }

                            if (DEBUG_DIFFING) {
                                console.group("Update!")
                                for (let patch of patches) {
                                    console.group(`Patch :${patch.op}`)
                                    console.log(patch.path)
                                    console.log(patch.value)
                                    console.groupEnd()
                                }
                                console.groupEnd()
                            }

                            let cells_stuck_in_limbo = new_notebook.cell_order.filter((cell_id) => new_notebook.cell_inputs[cell_id] == null)
                            if (cells_stuck_in_limbo.length !== 0) {
                                console.warn(`cells_stuck_in_limbo:`, cells_stuck_in_limbo)
                                new_notebook.cell_order = new_notebook.cell_order.filter((cell_id) => new_notebook.cell_inputs[cell_id] != null)
                            }
                            this.on_patches_hook(patches)
                            state.notebook = new_notebook
                        }),
                        () => resolve(reverse_of_patches)
                    )
                } else {
                    resolve([])
                }
            })

        this.apply_notebook_patches = apply_notebook_patches
        // these are update message that are _not_ a response to a `send(*, *, {create_promise: true})`
        const on_update = (update, by_me) => {
            if (this.state.notebook.notebook_id === update.notebook_id) {
                if (this.state.binder_phase != null) console.debug("on_update", update, by_me)
                const message = update.message
                switch (update.type) {
                    case "notebook_diff":
                        let apply_promise = Promise.resolve()
                        if (message?.response?.from_reset) {
                            console.log("Trying to reset state after failure")
                            apply_promise = apply_notebook_patches(
                                message.patches,
                                empty_notebook_state({ notebook_id: this.state.notebook.notebook_id })
                            ).catch((e) => {
                                alert("Oopsie!! please refresh your browser and everything will be alright!")
                                throw e
                            })
                        } else if (message.patches.length !== 0) {
                            apply_promise = apply_notebook_patches(message.patches)
                        }

                        const set_waiting = () => {
                            let from_update = message?.response?.update_went_well != null
                            let is_just_acknowledgement = from_update && message.patches.length === 0
                            // console.log("Received patches!", message.patches, message.response, is_just_acknowledgement)

                            if (!is_just_acknowledgement) {
                                this.waiting_for_bond_to_trigger_execution = false
                            }
                        }
                        apply_promise
                            .then(set_waiting)
                            .catch((e) => {
                                set_waiting()
                                throw e
                            })
                            .then(() => {
                                this.send_queued_bond_changes()
                            })

                        break
                    default:
                        console.error("Received unknown update type!", update)
                        // alert("Something went wrong 🙈\n Try clearing your browser cache and refreshing the page")
                        break
                }
                if (this.state.binder_phase != null) console.debug("on_update done")
            } else {
                // Update for a different notebook, TODO maybe log this as it shouldn't happen
            }
        }

        const on_establish_connection = async (client) => {
            // nasty
            Object.assign(this.client, client)
            try {
                const { default: environment } = await import(this.client.session_options.server.injected_javascript_data_url)
                const { custom_editor_header_component } = environment({ client, editor: this, imports: { preact } })
                this.setState({
                    extended_components: {
                        ...this.state.extended_components,
                        CustomHeader: custom_editor_header_component,
                    },
                })
            } catch (e) {}

            // @ts-ignore
            window.version_info = this.client.version_info // for debugging

            if (!client.notebook_exists) {
                console.error("Notebook does not exist. Not connecting.")
                return
            }
            console.debug("Sending update_notebook request...")
            await this.client.send("update_notebook", { updates: [] }, { notebook_id: this.state.notebook.notebook_id }, false)
            console.debug("Received update_notebook request")

            this.setState({ initializing: false, static_preview: false, binder_phase: this.state.binder_phase == null ? null : BinderPhase.ready })

            // do one autocomplete to trigger its precompilation
            // TODO Do this from julia itself
            this.client.send("complete", { query: "sq" }, { notebook_id: this.state.notebook.notebook_id })

            setTimeout(init_feedback, 2 * 1000) // 2 seconds - load feedback a little later for snappier UI
        }

        const on_connection_status = (val) => this.setState({ connected: val })

        const on_reconnect = () => {
            console.warn("Reconnected! Checking states")

            return true
        }

        this.export_url = (/** @type {string} */ u) =>
            this.state.binder_session_url == null
                ? `./${u}?id=${this.state.notebook.notebook_id}`
                : `${this.state.binder_session_url}${u}?id=${this.state.notebook.notebook_id}&token=${this.state.binder_session_token}`

        /** @type {import('../common/PlutoConnection').PlutoConnection} */
        this.client = /** @type {import('../common/PlutoConnection').PlutoConnection} */ ({})

        this.connect = (ws_address = undefined) =>
            create_pluto_connection({
                ws_address: ws_address,
                on_unrequested_update: on_update,
                on_connection_status: on_connection_status,
                on_reconnect: on_reconnect,
                connect_metadata: { notebook_id: this.state.notebook.notebook_id },
            }).then(on_establish_connection)

        this.real_actions = this.actions
        this.fake_actions =
            launch_params.slider_server_url != null
                ? slider_server_actions({
                      setStatePromise: this.setStatePromise,
                      actions: this.actions,
                      launch_params: launch_params,
                      apply_notebook_patches,
                      get_original_state: () => this.props.initial_notebook_state,
                      get_current_state: () => this.state.notebook,
                  })
                : nothing_actions({
                      actions: this.actions,
                  })

        this.on_disable_ui = () => {
            set_disable_ui_css(this.state.disable_ui)

            //@ts-ignore
            this.actions = this.state.disable_ui || (launch_params.slider_server_url != null && !this.state.connected) ? this.fake_actions : this.real_actions //heyo
        }
        this.on_disable_ui()

        setInterval(() => {
            if (!this.state.static_preview && document.visibilityState === "visible") {
                // view stats on https://stats.plutojl.org/
                //@ts-ignore
                count_stat(`editing/${window?.version_info?.pluto ?? "unknown"}`)
            }
        }, 1000 * 15 * 60)
        setInterval(() => {
            if (!this.state.static_preview && document.visibilityState === "visible") {
                update_stored_recent_notebooks(this.state.notebook.path)
            }
        }, 1000 * 5)

        // Not completely happy with this yet, but it will do for now - DRAL
        /** Patches that are being delayed until all cells have finished running. */
        this.bonds_changes_to_apply_when_done = []
        this.send_queued_bond_changes = () => {
            if (this.notebook_is_idle() && this.bonds_changes_to_apply_when_done.length !== 0) {
                // console.log("Applying queued bond changes!", this.bonds_changes_to_apply_when_done)
                let bonds_patches = this.bonds_changes_to_apply_when_done
                this.bonds_changes_to_apply_when_done = []
                this.update_notebook((notebook) => {
                    applyPatches(notebook, bonds_patches)
                })
            }
        }
        /** Whether we just set a bond value which will trigger a cell to run, but we are still waiting for the server to process the bond value (and run the cell). See https://github.com/fonsp/Pluto.jl/issues/1891 for more info. */
        this.waiting_for_bond_to_trigger_execution = false
        /** Number of local updates that have not yet been applied to the server's state. */
        this.pending_local_updates = 0
        this.js_init_set = new SetWithEmptyCallback(() => {
            // console.info("All scripts finished!")
            this.send_queued_bond_changes()
        })
        /** Is the notebook ready to execute code right now? (i.e. are no cells queued or running?) */
        this.notebook_is_idle = () => {
            return !(
                this.waiting_for_bond_to_trigger_execution ||
                this.pending_local_updates > 0 ||
                // a cell is running:
                Object.values(this.state.notebook.cell_results).some((cell) => cell.running || cell.queued) ||
                // a cell is initializing JS:
                !_.isEmpty(this.js_init_set) ||
                !this.is_process_ready()
            )
        }
        this.is_process_ready = () =>
            this.state.notebook.process_status === ProcessStatus.starting || this.state.notebook.process_status === ProcessStatus.ready

        let bond_will_trigger_evaluation = (/** @type {string|PropertyKey} */ sym) =>
            Object.entries(this.state.notebook.cell_dependencies).some(([cell_id, deps]) => {
                // if the other cell depends on the variable `sym`...
                if (deps.upstream_cells_map.hasOwnProperty(sym)) {
                    // and the cell is not disabled
                    const running_disabled = this.state.notebook.cell_inputs[cell_id].metadata.disabled
                    return !running_disabled
                }
            })

        let last_update_notebook_task = Promise.resolve()
        /** @param {(notebook: NotebookData) => void} mutate_fn */
        let update_notebook = (mutate_fn) => {
            const new_task = last_update_notebook_task.then(async () => {
                // if (this.state.initializing) {
                //     console.error("Update notebook done during initializing, strange")
                //     return
                // }

                let [new_notebook, changes, inverseChanges] = produceWithPatches(this.state.notebook, (notebook) => {
                    mutate_fn(notebook)
                })

                // If "notebook is not idle" we seperate and store the bonds updates,
                // to send when the notebook is idle. This delays the updating of the bond for performance,
                // but when the server can discard bond updates itself (now it executes them one by one, even if there is a newer update ready)
                // this will no longer be necessary
                let is_idle = this.notebook_is_idle()
                let changes_involving_bonds = changes.filter((x) => x.path[0] === "bonds")
                if (!is_idle) {
                    this.bonds_changes_to_apply_when_done = [...this.bonds_changes_to_apply_when_done, ...changes_involving_bonds]
                    changes = changes.filter((x) => x.path[0] !== "bonds")
                }

                if (DEBUG_DIFFING) {
                    try {
                        let previous_function_name = new Error().stack.split("\n")[2].trim().split(" ")[1]
                        console.log(`Changes to send to server from "${previous_function_name}":`, changes)
                    } catch (error) {}
                }
                for (let change of changes) {
                    if (change.path.some((x) => typeof x === "number")) {
                        throw new Error("This sounds like it is editing an array...")
                    }
                }

                if (changes.length === 0) {
                    return
                }
                if (is_idle) {
                    this.waiting_for_bond_to_trigger_execution ||= changes_involving_bonds.some(
                        (x) => x.path.length >= 1 && bond_will_trigger_evaluation(x.path[1])
                    )
                }
                this.pending_local_updates++
                this.on_patches_hook(changes)
                try {
                    // console.log("Sending changes to server:", changes)
                    await Promise.all([
                        this.client.send("update_notebook", { updates: changes }, { notebook_id: this.state.notebook.notebook_id }, false).then((response) => {
                            if (response.message?.response?.update_went_well === "👎") {
                                // We only throw an error for functions that are waiting for this
                                // Notebook state will already have the changes reversed
                                throw new Error(`Pluto update_notebook error: (from Julia: ${response.message.response.why_not})`)
                            }
                        }),
                        this.setStatePromise({
                            notebook: new_notebook,
                            last_update_time: Date.now(),
                        }),
                    ])
                } finally {
                    this.pending_local_updates--
                }
            })
            last_update_notebook_task = new_task.catch(console.error)
            return new_task
        }
        this.update_notebook = update_notebook
        //@ts-ignore
        window.shutdownNotebook = this.close = () => {
            this.client.send(
                "shutdown_notebook",
                {
                    keep_in_session: false,
                },
                {
                    notebook_id: this.state.notebook.notebook_id,
                },
                false
            )
        }
        this.submit_file_change = async (new_path, reset_cm_value) => {
            const old_path = this.state.notebook.path
            if (old_path === new_path) {
                return
            }
            if (!this.state.notebook.in_temp_dir) {
                if (!confirm("Are you sure? Will move from\n\n" + old_path + "\n\nto\n\n" + new_path)) {
                    throw new Error("Declined by user")
                }
            }

            this.setState({ moving_file: true })

            try {
                await update_notebook((notebook) => {
                    notebook.in_temp_dir = false
                    notebook.path = new_path
                })
                // @ts-ignore
                document.activeElement?.blur()
            } catch (error) {
                alert("Failed to move file:\n\n" + error.message)
            } finally {
                this.setState({ moving_file: false })
            }
        }

        this.delete_selected = (verb) => {
            if (this.state.selected_cells.length > 0) {
                this.actions.confirm_delete_multiple(verb, this.state.selected_cells)
                return true
            }
        }

        this.run_selected = () => {
            return this.actions.set_and_run_multiple(this.state.selected_cells)
        }

        this.serialize_selected = (cell_id = null) => {
            const cells_to_serialize = cell_id == null || this.state.selected_cells.includes(cell_id) ? this.state.selected_cells : [cell_id]
            if (cells_to_serialize.length) {
                return serialize_cells(cells_to_serialize.map((id) => this.state.notebook.cell_inputs[id]))
            }
        }

        this.patch_listeners = []
        this.on_patches_hook = (patches) => {
            this.patch_listeners.forEach((f) => f(patches))
        }

        let ctrl_down_last_val = { current: false }
        const set_ctrl_down = (value) => {
            if (value !== ctrl_down_last_val.current) {
                ctrl_down_last_val.current = value
                document.body.querySelectorAll("pluto-variable-link").forEach((el) => {
                    el.setAttribute("data-ctrl-down", value ? "true" : "false")
                })
            }
        }

        document.addEventListener("keyup", (e) => {
            set_ctrl_down(has_ctrl_or_cmd_pressed(e))
        })
        document.addEventListener("visibilitychange", (e) => {
            set_ctrl_down(false)
            setTimeout(() => {
                set_ctrl_down(false)
            }, 100)
        })

        document.addEventListener("keydown", (e) => {
            set_ctrl_down(has_ctrl_or_cmd_pressed(e))
            // if (e.defaultPrevented) {
            //     return
            // }
            if (e.key.toLowerCase() === "q" && has_ctrl_or_cmd_pressed(e)) {
                // This one can't be done as cmd+q on mac, because that closes chrome - Dral
                if (Object.values(this.state.notebook.cell_results).some((c) => c.running || c.queued)) {
                    this.actions.interrupt_remote()
                }
                e.preventDefault()
            } else if (e.key.toLowerCase() === "s" && has_ctrl_or_cmd_pressed(e)) {
                const some_cells_ran = this.actions.set_and_run_all_changed_remote_cells()
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

    Ctrl+M:   toggle markdown

    The notebook file saves every time you run a cell.`
                )
                e.preventDefault()
            } else if (e.key === "Escape") {
                this.setState({
                    recording_waiting_to_start: false,
                    selected_cells: [],
                    export_menu_open: false,
                })
            }

            if (this.state.disable_ui && this.state.offer_binder) {
                // const code = e.key.charCodeAt(0)
                if (e.key === "Enter" || e.key.length === 1) {
                    if (!document.body.classList.contains("wiggle_binder")) {
                        document.body.classList.add("wiggle_binder")
                        setTimeout(() => {
                            document.body.classList.remove("wiggle_binder")
                        }, 1000)
                    }
                }
            }
        })

        document.addEventListener("copy", (e) => {
            if (!in_textarea_or_input()) {
                const serialized = this.serialize_selected()
                if (serialized) {
                    navigator.clipboard.writeText(serialized).catch((err) => {
                        alert(`Error copying cells: ${e}`)
                    })
                }
            }
        })

        document.addEventListener("cut", (e) => {
            // Disabled because we don't want to accidentally delete cells
            // or we can enable it with a prompt
            // Even better would be excel style: grey out until you paste it. If you paste within the same notebook, then it is just a move.
            // if (!in_textarea_or_input()) {
            //     const serialized = this.serialize_selected()
            //     if (serialized) {
            //         navigator.clipboard
            //             .writeText(serialized)
            //             .then(() => this.delete_selected("Cut"))
            //             .catch((err) => {
            //                 alert(`Error cutting cells: ${e}`)
            //             })
            //     }
            // }
        })

        document.addEventListener("paste", async (e) => {
            const topaste = e.clipboardData.getData("text/plain")
            const deserializer = detect_deserializer(topaste)
            if (deserializer != null) {
                this.actions.add_deserialized_cells(topaste, -1, deserializer)
                e.preventDefault()
            }
        })

        window.addEventListener("beforeunload", (event) => {
            const unsaved_cells = this.state.notebook.cell_order.filter(
                (id) => this.state.cell_inputs_local[id] && this.state.notebook.cell_inputs[id].code !== this.state.cell_inputs_local[id].code
            )
            const first_unsaved = unsaved_cells[0]
            if (first_unsaved != null) {
                window.dispatchEvent(new CustomEvent("cell_focus", { detail: { cell_id: first_unsaved } }))
                // } else if (this.state.notebook.in_temp_dir) {
                //     window.scrollTo(0, 0)
                //     // TODO: focus file picker
                console.log("Preventing unload")
                event.stopImmediatePropagation()
                event.preventDefault()
                event.returnValue = ""
            } else {
                console.warn("unloading 👉 disconnecting websocket")
                //@ts-ignore
                if (window.shutdown_binder != null) {
                    // hmmmm that would also shut down the binder if you refreshed, or if you navigate to the binder session main menu by clicking the pluto logo.
                    // Let's keep it disabled for now and let the timeout take care of shutting down the binder
                    // window.shutdown_binder()
                }
                // and don't prevent the unload
            }
        })
    }

    componentDidMount() {
        if (this.state.static_preview) {
            this.setState({
                initializing: false,
                binder_phase: this.state.offer_binder ? BinderPhase.wait_for_user : null,
            })
            // view stats on https://stats.plutojl.org/
            count_stat(`article-view`)
        } else {
            this.connect()
        }
    }

    componentDidUpdate(old_props, old_state) {
        //@ts-ignore
        window.editor_state = this.state

        const new_state = this.state

        if (old_state?.notebook?.path !== new_state.notebook.path) {
            update_stored_recent_notebooks(new_state.notebook.path, old_state?.notebook?.path)
        }
        if (old_state?.notebook?.shortpath !== new_state.notebook.shortpath) {
            document.title = "🎈 " + new_state.notebook.shortpath + " — Pluto.jl"
        }

        // this property is used to tell our frontend tests that the updates are done
        //@ts-ignore
        document.body._update_is_ongoing = this.pending_local_updates > 0

        this.send_queued_bond_changes()

        if (old_state.binder_phase !== this.state.binder_phase && this.state.binder_phase != null) {
            const phase = Object.entries(BinderPhase).find(([k, v]) => v == this.state.binder_phase)[0]
            console.info(`Binder phase: ${phase} at ${new Date().toLocaleTimeString()}`)
        }

        if (old_state.disable_ui !== this.state.disable_ui) {
            this.on_disable_ui()
        }
        if (!this.state.initializing) {
            setup_mathjax()
        }

        if (old_state.notebook.nbpkg?.restart_recommended_msg !== new_state.notebook.nbpkg?.restart_recommended_msg) {
            console.warn(`New restart recommended message: ${new_state.notebook.nbpkg?.restart_recommended_msg}`)
        }
        if (old_state.notebook.nbpkg?.restart_required_msg !== new_state.notebook.nbpkg?.restart_required_msg) {
            console.warn(`New restart required message: ${new_state.notebook.nbpkg?.restart_required_msg}`)
        }
    }

    componentWillUpdate(new_props, new_state) {
        this.cached_status = statusmap(new_state, this.props.launch_params)

        Object.entries(this.cached_status).forEach(([k, v]) => {
            document.body.classList.toggle(k, v === true)
        })
    }

    render() {
        const { launch_params } = this.props
        let { export_menu_open, notebook } = this.state

        const status = this.cached_status ?? statusmap(this.state, launch_params)
        const statusval = first_true_key(status)

        if (status.isolated_cell_view) {
            return html`
                <${PlutoContext.Provider} value=${this.actions}>
                    <${PlutoBondsContext.Provider} value=${this.state.notebook.bonds}>
                        <${PlutoJSInitializingContext.Provider} value=${this.js_init_set}>
                            <${ProgressBar} notebook=${this.state.notebook} binder_phase=${this.state.binder_phase} status=${status}/>
                            <div style="width: 100%">
                                ${this.state.notebook.cell_order.map(
                                    (cell_id, i) => html`
                                        <${IsolatedCell}
                                            cell_id=${cell_id}
                                            cell_results=${this.state.notebook.cell_results[cell_id]}
                                            hidden=${!launch_params.isolated_cell_ids.includes(cell_id)}
                                        />
                                    `
                                )}
                            </div>
                        </${PlutoJSInitializingContext.Provider}>
                    </${PlutoBondsContext.Provider}>
                </${PlutoContext.Provider}>
            `
        }

        const restart_button = (text) => html`<a
            href="#"
            onClick=${() => {
                this.client.send(
                    "restart_process",
                    {},
                    {
                        notebook_id: notebook.notebook_id,
                    }
                )
            }}
            >${text}</a
        >`

        return html`
            ${this.state.disable_ui === false && html`<${HijackExternalLinksToOpenInNewTab} />`}
            
            <${PlutoContext.Provider} value=${this.actions}>
                <${PlutoBondsContext.Provider} value=${this.state.notebook.bonds}>
                    <${PlutoJSInitializingContext.Provider} value=${this.js_init_set}>
                    <${Scroller} active=${this.state.scroller} />
                    <${ProgressBar} notebook=${this.state.notebook} binder_phase=${this.state.binder_phase} status=${status}/>
                    <header id="pluto-nav" className=${export_menu_open ? "show_export" : ""}>
                        <${ExportBanner}
                            notebookfile_url=${this.export_url("notebookfile")}
                            notebookexport_url=${this.export_url("notebookexport")}
                            open=${export_menu_open}
                            onClose=${() => this.setState({ export_menu_open: false })}
                            start_recording=${() => this.setState({ recording_waiting_to_start: true })}
                        />
                        ${
                            status.binder
                                ? html`<div id="binder_spinners">
                                      <binder-spinner id="ring_1"></binder-spinner>
                                      <binder-spinner id="ring_2"></binder-spinner>
                                      <binder-spinner id="ring_3"></binder-spinner>
                                  </div>`
                                : null
                        }
                        <nav id="at_the_top">
                            <a href=${
                                this.state.static_preview || this.state.binder_phase != null
                                    ? `${this.state.binder_session_url}?token=${this.state.binder_session_token}`
                                    : "./"
                            }>
                                <h1><img id="logo-big" src=${url_logo_big} alt="Pluto.jl" /><img id="logo-small" src=${url_logo_small} /></h1>
                            </a>
                            ${
                                this.state.extended_components.CustomHeader &&
                                html`<${this.state.extended_components.CustomHeader} notebook_id=${this.state.notebook.notebook_id} />`
                            }
                            <div class="flex_grow_1"></div>
                            ${
                                this.state.extended_components.CustomHeader == null &&
                                (status.binder
                                    ? html`<pluto-filepicker><a href=${this.export_url("notebookfile")} target="_blank">Save notebook...</a></pluto-filepicker>`
                                    : html`<${FilePicker}
                                          client=${this.client}
                                          value=${notebook.in_temp_dir ? "" : notebook.path}
                                          on_submit=${this.submit_file_change}
                                          suggest_new_file=${{
                                              base: this.client.session_options == null ? "" : this.client.session_options.server.notebook_path_suggestion,
                                              name: notebook.shortpath,
                                          }}
                                          placeholder="Save notebook..."
                                          button_label=${notebook.in_temp_dir ? "Choose" : "Move"}
                                      />`)
                            }
                            <div class="flex_grow_2"></div>
                            <button class="toggle_export" title="Export..." onClick=${() => {
                                this.setState({ export_menu_open: !export_menu_open })
                            }}><span></span></button>
                            <div id="process_status">${
                                status.binder && status.loading
                                    ? "Loading binder..."
                                    : statusval === "disconnected"
                                    ? "Reconnecting..."
                                    : statusval === "loading"
                                    ? "Loading..."
                                    : statusval === "nbpkg_restart_required"
                                    ? html`${restart_button("Restart notebook")}${" (required)"}`
                                    : statusval === "nbpkg_restart_recommended"
                                    ? html`${restart_button("Restart notebook")}${" (recommended)"}`
                                    : statusval === "process_restarting"
                                    ? "Process exited — restarting..."
                                    : statusval === "process_dead"
                                    ? html`${"Process exited — "}${restart_button("restart")}`
                                    : null
                            }</div>
                        </nav>
                    </header>
                    
                    <${RecordingUI} 
                        notebook_name=${notebook.shortpath}
                        recording_waiting_to_start=${this.state.recording_waiting_to_start}
                        set_recording_states=${({ is_recording, recording_waiting_to_start }) => this.setState({ is_recording, recording_waiting_to_start })}
                        is_recording=${this.state.is_recording}
                        patch_listeners=${this.patch_listeners}
                        export_url=${this.export_url}
                    />
                    <${RecordingPlaybackUI} 
                        recording_url=${launch_params.recording_url}
                        audio_src=${launch_params.recording_audio_url}
                        initializing=${this.state.initializing}
                        apply_notebook_patches=${this.apply_notebook_patches}
                        reset_notebook_state=${() =>
                            this.setStatePromise(
                                immer((state) => {
                                    state.notebook = this.props.initial_notebook_state
                                })
                            )}
                    />
                    
                    <${BinderButton} 
                        binder_phase=${this.state.binder_phase} 
                        start_binder=${() => start_binder({ setStatePromise: this.setStatePromise, connect: this.connect, launch_params: launch_params })} 
                        notebookfile=${launch_params.notebookfile == null ? null : new URL(launch_params.notebookfile, window.location.href).href} />
                    
                    ${launch_params.preamble_html ? html`<${RawHTMLContainer} body=${launch_params.preamble_html} className=${"preamble"} />` : null}
                    <${Main}>
                        <${Preamble}
                            last_update_time=${this.state.last_update_time}
                            any_code_differs=${status.code_differs}
                            last_hot_reload_time=${this.state.notebook.last_hot_reload_time}
                            connected=${this.state.connected}
                        />
                        <${Notebook}
                            notebook=${this.state.notebook}
                            cell_inputs_local=${this.state.cell_inputs_local}
                            disable_input=${this.state.disable_ui || !this.state.connected /* && this.state.binder_phase == null*/}
                            show_logs=${this.state.show_logs}
                            set_show_logs=${(enabled) => this.setState({ show_logs: enabled })}
                            last_created_cell=${this.state.last_created_cell}
                            selected_cells=${this.state.selected_cells}
                            is_initializing=${this.state.initializing}
                            is_process_ready=${this.is_process_ready()}
                        />
                        <${DropRuler} 
                            actions=${this.actions}
                            selected_cells=${this.state.selected_cells}
                            set_scroller=${(enabled) => this.setState({ scroller: enabled })}
                            serialize_selected=${this.serialize_selected}
                        />
                        ${
                            this.state.disable_ui ||
                            html`<${SelectionArea}
                                actions=${this.actions}
                                cell_order=${this.state.notebook.cell_order}
                                selected_cell_ids=${this.state.selected_cell_ids}
                                set_scroller=${(enabled) => {
                                    this.setState({ scroller: enabled })
                                }}
                                on_selection=${(selected_cell_ids) => {
                                    // @ts-ignore
                                    if (
                                        selected_cell_ids.length !== this.state.selected_cells.length ||
                                        _.difference(selected_cell_ids, this.state.selected_cells).length !== 0
                                    ) {
                                        this.setState({
                                            selected_cells: selected_cell_ids,
                                        })
                                    }
                                }}
                            />`
                        }
                    </${Main}>
                    <${LiveDocs}
                        desired_doc_query=${this.state.desired_doc_query}
                        on_update_doc_query=${this.actions.set_doc_query}
                        notebook=${this.state.notebook}
                    />
                    <${Popup} notebook=${this.state.notebook}/>
                    <${UndoDelete}
                        recently_deleted=${this.state.recently_deleted}
                        on_click=${() => {
                            this.update_notebook((notebook) => {
                                for (let { index, cell } of this.state.recently_deleted) {
                                    notebook.cell_inputs[cell.cell_id] = cell
                                    notebook.cell_order = [...notebook.cell_order.slice(0, index), cell.cell_id, ...notebook.cell_order.slice(index, Infinity)]
                                }
                            }).then(() => {
                                this.actions.set_and_run_multiple(this.state.recently_deleted.map(({ cell }) => cell.cell_id))
                            })
                        }}
                    />
                    <${SlideControls} />
                    <footer>
                        <div id="info">
                            <a href="https://github.com/fonsp/Pluto.jl/wiki" target="_blank">FAQ</a>
                            <span style="flex: 1"></span>
                            <form id="feedback" action="#" method="post">
                                <label for="opinion">🙋 How can we make <a href="https://github.com/fonsp/Pluto.jl" target="_blank">Pluto.jl</a> better?</label>
                                <input type="text" name="opinion" id="opinion" autocomplete="off" placeholder="Instant feedback..." />
                                <button>Send</button>
                            </form>
                        </div>
                    </footer>
                </${PlutoJSInitializingContext.Provider}>
                </${PlutoBondsContext.Provider}>
            </${PlutoContext.Provider}>
        `
    }
}

/* LOCALSTORAGE NOTEBOOKS LIST */

// TODO This is now stored locally, lets store it somewhere central 😈
export const update_stored_recent_notebooks = (recent_path, also_delete = undefined) => {
    if (recent_path != null && recent_path !== default_path) {
        const stored_string = localStorage.getItem("recent notebooks")
        const stored_list = stored_string != null ? JSON.parse(stored_string) : []
        const oldpaths = stored_list

        const newpaths = [recent_path, ...oldpaths.filter((path) => path !== recent_path && path !== also_delete)]
        if (!_.isEqual(oldpaths, newpaths)) {
            localStorage.setItem("recent notebooks", JSON.stringify(newpaths.slice(0, 50)))
        }
    }
}
