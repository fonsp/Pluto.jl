import { html, Component } from "../imports/Preact.js"
import * as preact from "../imports/Preact.js"
import immer, { applyPatches, produceWithPatches } from "../imports/immer.js"
import _ from "../imports/lodash.js"

import { empty_notebook_state, set_disable_ui_css } from "../editor.js"
import { create_pluto_connection, ws_address_from_base } from "../common/PlutoConnection.js"
import { init_feedback } from "../common/Feedback.js"
import { serialize_cells, deserialize_cells, detect_deserializer } from "../common/Serialization.js"

import { FilePicker } from "./FilePicker.js"
import { Preamble } from "./Preamble.js"
import { NotebookMemo as Notebook } from "./Notebook.js"
import { BottomRightPanel } from "./BottomRightPanel.js"
import { DropRuler } from "./DropRuler.js"
import { SelectionArea } from "./SelectionArea.js"
import { RecentlyDisabledInfo, UndoDelete } from "./UndoDelete.js"
import { SlideControls } from "./SlideControls.js"
import { Scroller } from "./Scroller.js"
import { ExportBanner } from "./ExportBanner.js"
import { Popup } from "./Popup.js"

import { slice_utf8, length_utf8 } from "../common/UnicodeTools.js"
import {
    has_ctrl_or_cmd_pressed,
    ctrl_or_cmd_name,
    is_mac_keyboard,
    in_textarea_or_input,
    and,
    control_name,
    alt_or_options_name,
} from "../common/KeyboardShortcuts.js"
import { PlutoActionsContext, PlutoBondsContext, PlutoJSInitializingContext, SetWithEmptyCallback } from "../common/PlutoContext.js"
import { BackendLaunchPhase, count_stat } from "../common/Binder.js"
import { setup_mathjax } from "../common/SetupMathJax.js"
import { slider_server_actions, nothing_actions } from "../common/SliderServerClient.js"
import { ProgressBar } from "./ProgressBar.js"
import { NonCellOutput } from "./NonCellOutput.js"
import { IsolatedCell } from "./Cell.js"
import { RecordingPlaybackUI, RecordingUI } from "./RecordingUI.js"
import { HijackExternalLinksToOpenInNewTab } from "./HackySideStuff/HijackExternalLinksToOpenInNewTab.js"
import { FrontMatterInput } from "./FrontmatterInput.js"
import { EditorLaunchBackendButton } from "./Editor/LaunchBackendButton.js"
import { get_environment } from "../common/Environment.js"
import { ProcessStatus } from "../common/ProcessStatus.js"
import { SafePreviewUI } from "./SafePreviewUI.js"
import { open_pluto_popup } from "../common/open_pluto_popup.js"

// This is imported asynchronously - uncomment for development
// import environment from "../common/Environment.js"

export const default_path = ""
const DEBUG_DIFFING = false

// Be sure to keep this in sync with DEFAULT_CELL_METADATA in Cell.jl
/** @type {CellMetaData} */
const DEFAULT_CELL_METADATA = {
    disabled: false,
    show_logs: true,
    skip_as_script: false,
}

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

/**
 * Map of status => Bool. In order of decreasing priority.
 */
const statusmap = (/** @type {EditorState} */ state, /** @type {LaunchParameters} */ launch_params) => ({
    disconnected: !(state.connected || state.initializing || state.static_preview),
    loading:
        (state.backend_launch_phase != null &&
            BackendLaunchPhase.wait_for_user < state.backend_launch_phase &&
            state.backend_launch_phase < BackendLaunchPhase.ready) ||
        state.initializing ||
        state.moving_file,
    process_waiting_for_permission: state.notebook.process_status === ProcessStatus.waiting_for_permission && !state.initializing,
    process_restarting: state.notebook.process_status === ProcessStatus.waiting_to_restart,
    process_dead: state.notebook.process_status === ProcessStatus.no_process || state.notebook.process_status === ProcessStatus.waiting_to_restart,
    nbpkg_restart_required: state.notebook.nbpkg?.restart_required_msg != null,
    nbpkg_restart_recommended: state.notebook.nbpkg?.restart_recommended_msg != null,
    nbpkg_disabled: state.notebook.nbpkg?.enabled === false || state.notebook.nbpkg?.waiting_for_permission_but_probably_disabled === true,
    static_preview: state.static_preview,
    bonds_disabled: !(state.connected || state.initializing || launch_params.slider_server_url != null),
    offer_binder: state.backend_launch_phase === BackendLaunchPhase.wait_for_user && launch_params.binder_url != null,
    offer_local: state.backend_launch_phase === BackendLaunchPhase.wait_for_user && launch_params.pluto_server_url != null,
    binder: launch_params.binder_url != null && state.backend_launch_phase != null,
    code_differs: state.notebook.cell_order.some(
        (cell_id) => state.cell_inputs_local[cell_id] != null && state.notebook.cell_inputs[cell_id].code !== state.cell_inputs_local[cell_id].code
    ),
    recording_waiting_to_start: state.recording_waiting_to_start,
    is_recording: state.is_recording,
    isolated_cell_view: launch_params.isolated_cell_ids != null && launch_params.isolated_cell_ids.length > 0,
    sanitize_html: state.notebook.process_status === ProcessStatus.waiting_for_permission,
})

const first_true_key = (obj) => {
    for (let [k, v] of Object.entries(obj)) {
        if (v) {
            return k
        }
    }
}

/**
 * @typedef CellMetaData
 * @type {{
 *    disabled: boolean,
 *    show_logs: boolean,
 *    skip_as_script: boolean
 *  }}
 *
 * @typedef CellInputData
 * @type {{
 *  cell_id: string,
 *  code: string,
 *  code_folded: boolean,
 *  metadata: CellMetaData,
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
 * @typedef StatusEntryData
 * @type {{
 *   name: string,
 *   success?: boolean,
 *   started_at: number?,
 *   finished_at: number?,
 *   timing?: "remote" | "local",
 *   subtasks: Record<string,StatusEntryData>,
 * }}
 */

/**
 * @typedef CellResultData
 * @type {{
 *  cell_id: string,
 *  queued: boolean,
 *  running: boolean,
 *  errored: boolean,
 *  runtime: number?,
 *  downstream_cells_map: { string: [string]},
 *  upstream_cells_map: { string: [string]},
 *  precedence_heuristic: number?,
 *  depends_on_disabled_cells: boolean,
 *  depends_on_skipped_cells: boolean,
 *  output: {
 *      body: string,
 *      persist_js_state: boolean,
 *      last_run_timestamp: number,
 *      mime: string,
 *      rootassignee: string?,
 *      has_pluto_hook_features: boolean,
 *  },
 *  logs: Array<LogEntryData>,
 *  published_object_keys: [string],
 * }}
 */

/**
 * @typedef CellDependencyData
 * @property {string} cell_id
 * @property {Map<string, Array<string>>} downstream_cells_map A map where the keys are the variables *defined* by this cell, and a value is the list of cell IDs that reference a variable.
 * @property {Map<string, Array<string>>} upstream_cells_map A map where the keys are the variables *referenced* by this cell, and a value is the list of cell IDs that define a variable.
 * @property {number} precedence_heuristic
 */

/**
 * @typedef NotebookPkgData
 * @type {{
 *  enabled: boolean,
 *  waiting_for_permission: boolean?,
 *  waiting_for_permission_but_probably_disabled: boolean?,
 *  restart_recommended_msg: string?,
 *  restart_required_msg: string?,
 *  installed_versions: { [pkg_name: string]: string },
 *  terminal_outputs: { [pkg_name: string]: string },
 *  install_time_ns: number?,
 *  busy_packages: string[],
 *  instantiated: boolean,
 * }}
 */

/**
 * @typedef LaunchParameters
 * @type {{
 *  notebook_id: string?,
 *  statefile: string?,
 *  statefile_integrity: string?,
 *  notebookfile: string?,
 *  notebookfile_integrity: string?,
 *  disable_ui: boolean,
 *  preamble_html: string?,
 *  isolated_cell_ids: string[]?,
 *  binder_url: string?,
 *  pluto_server_url: string?,
 *  slider_server_url: string?,
 *  recording_url: string?,
 *  recording_url_integrity: string?,
 *  recording_audio_url: string?,
 * }}
 */

/**
 * @typedef BondValueContainer
 * @type {{ value: any }}
 */

/**
 * @typedef BondValuesDict
 * @type {{ [name: string]: BondValueContainer }}
 */

/**
 * @typedef NotebookData
 * @type {{
 *  pluto_version?: string,
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
 *  bonds: BondValuesDict,
 *  nbpkg: NotebookPkgData?,
 *  metadata: object,
 *  status_tree: StatusEntryData?,
 * }}
 */

const url_logo_big = document.head.querySelector("link[rel='pluto-logo-big']")?.getAttribute("href") ?? ""
export const url_logo_small = document.head.querySelector("link[rel='pluto-logo-small']")?.getAttribute("href") ?? ""

/**
 * @typedef EditorProps
 * @type {{
 * launch_params: LaunchParameters,
 * initial_notebook_state: NotebookData,
 * preamble_element: preact.ReactElement?,
 * }}
 */

/**
 * @typedef EditorState
 * @type {{
 * notebook: NotebookData,
 * cell_inputs_local: { [uuid: string]: { code: String } },
 * desired_doc_query: ?String,
 * recently_deleted: ?Array<{ index: number, cell: CellInputData }>,
 * last_update_time: number,
 * disable_ui: boolean,
 * static_preview: boolean,
 * backend_launch_phase: ?number,
 * backend_launch_logs: ?string,
 * binder_session_url: ?string,
 * binder_session_token: ?string,
 * refresh_target: ?string,
 * connected: boolean,
 * initializing: boolean,
 * moving_file: boolean,
 * scroller: {
 * up: boolean,
 * down: boolean,
 * },
 * export_menu_open: boolean,
 * last_created_cell: ?string,
 * selected_cells: Array<string>,
 * extended_components: any,
 * is_recording: boolean,
 * recording_waiting_to_start: boolean,
 * }}
 */

/**
 * @augments Component<EditorProps,EditorState>
 */
export class Editor extends Component {
    constructor(/** @type {EditorProps} */ props) {
        super(props)

        const { launch_params, initial_notebook_state } = this.props

        this.state = {
            notebook: /** @type {NotebookData} */ initial_notebook_state,
            cell_inputs_local: /** @type {{ [id: string]: CellInputData }} */ ({}),
            desired_doc_query: null,
            recently_deleted: /** @type {Array<{ index: number, cell: CellInputData }>} */ ([]),
            recently_auto_disabled_cells: /** @type {Map<string,[string,string]>} */ ({}),
            last_update_time: 0,

            disable_ui: launch_params.disable_ui,
            static_preview: launch_params.statefile != null,
            backend_launch_phase:
                launch_params.notebookfile != null && (launch_params.binder_url != null || launch_params.pluto_server_url != null)
                    ? BackendLaunchPhase.wait_for_user
                    : null,
            backend_launch_logs: null,
            binder_session_url: null,
            binder_session_token: null,
            refresh_target: null,
            connected: false,
            initializing: true,

            moving_file: false,
            scroller: {
                up: false,
                down: false,
            },
            export_menu_open: false,

            last_created_cell: null,
            selected_cells: /** @type {string[]} */ ([]),

            extended_components: {
                CustomHeader: null,
            },

            is_recording: false,
            recording_waiting_to_start: false,

            slider_server: {
                connecting: false,
                interactive: false,
            },
        }

        this.setStatePromise = (fn) => new Promise((r) => this.setState(fn, r))

        // these are things that can be done to the local notebook
        this.real_actions = {
            get_notebook: () => this?.state?.notebook || {},
            send: (message_type, ...args) => this.client.send(message_type, ...args),
            get_published_object: (objectid) => this.state.notebook.published_objects[objectid],
            //@ts-ignore
            update_notebook: (...args) => this.update_notebook(...args),
            set_doc_query: (query) => this.setState({ desired_doc_query: query }),
            set_local_cell: (cell_id, new_val) => {
                return this.setStatePromise(
                    immer((/** @type {EditorState} */ state) => {
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
                /** @type {Array<CellInputData>} Create copies of the cells with fresh ids */
                let new_cells = new_codes.map((code) => ({
                    cell_id: uuidv4(),
                    code: code,
                    code_folded: false,
                    metadata: {
                        ...DEFAULT_CELL_METADATA,
                    },
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
                    immer((/** @type {EditorState} */ state) => {
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
                                ...DEFAULT_CELL_METADATA,
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
                    immer((/** @type {EditorState} */ state) => {
                        state.cell_inputs_local[cell_id] = {
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
                            ...DEFAULT_CELL_METADATA,
                        },
                    }
                })

                this.setState(
                    immer((/** @type {EditorState} */ state) => {
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
                return update_notebook((notebook) => {
                    new_index = Math.max(0, new_index)
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
                        metadata: { ...DEFAULT_CELL_METADATA },
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
                    window.dispatchEvent(
                        new CustomEvent("set_waiting_to_run_smart", {
                            detail: {
                                cell_ids,
                            },
                        })
                    )

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
                        immer((/** @type {EditorState} */ state) => {
                            for (let cell_id of cell_ids) {
                                if (state.notebook.cell_results[cell_id] != null) {
                                    state.notebook.cell_results[cell_id].queued = this.is_process_ready()
                                } else {
                                    // nothing
                                }
                            }
                        })
                    )
                    const result = await this.client.send("run_multiple_cells", { cells: cell_ids }, { notebook_id: this.state.notebook.notebook_id })
                    const { disabled_cells } = result.message
                    if (Object.entries(disabled_cells).length > 0) {
                        await this.setStatePromise({
                            recently_auto_disabled_cells: disabled_cells,
                        })
                    }
                }
            },
            /**
             *
             * @param {string} name name of bound variable
             * @param {*} value value (not in wrapper object)
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
                        objectid,
                        dim,
                        cell_id,
                    },
                    { notebook_id: this.state.notebook.notebook_id },
                    false
                )
            },
            request_js_link_response: (cell_id, link_id, input) => {
                return this.client
                    .send(
                        "request_js_link_response",
                        {
                            cell_id,
                            link_id,
                            input,
                        },
                        { notebook_id: this.state.notebook.notebook_id }
                    )
                    .then((r) => r.message)
            },
            /** This actions avoids pushing selected cells all the way down, which is too heavy to handle! */
            get_selected_cells: (cell_id, /** @type {boolean} */ allow_other_selected_cells) =>
                allow_other_selected_cells ? this.state.selected_cells : [cell_id],
            get_avaible_versions: async ({ package_name, notebook_id }) => {
                const { message } = await this.client.send("nbpkg_available_versions", { package_name: package_name }, { notebook_id: notebook_id })
                return message.versions
            },
        }
        this.actions = { ...this.real_actions }

        const apply_notebook_patches = (patches, /** @type {NotebookData?} */ old_state = null, get_reverse_patches = false) =>
            new Promise((resolve) => {
                if (patches.length !== 0) {
                    const should_ignore_patch_error = (/** @type {string} */ failing_path) => failing_path.startsWith("status_tree")

                    let _copy_of_patches,
                        reverse_of_patches = []
                    this.setState(
                        immer((/** @type {EditorState} */ state) => {
                            let new_notebook
                            try {
                                // To test this, uncomment the lines below:
                                // if (Math.random() < 0.25) {
                                //     throw new Error(`Error: [Immer] minified error nr: 15 '${patches?.[0]?.path?.join("/")}'    .`)
                                // }

                                if (get_reverse_patches) {
                                    ;[new_notebook, _copy_of_patches, reverse_of_patches] = produceWithPatches(old_state ?? state.notebook, (state) => {
                                        applyPatches(state, patches)
                                    })
                                    // TODO: why was `new_notebook` not updated?
                                    // this is why the line below is also called when `get_reverse_patches === true`
                                }
                                new_notebook = applyPatches(old_state ?? state.notebook, patches)
                            } catch (exception) {
                                /** @type {String} Example: `"a.b[2].c"` */
                                const failing_path = String(exception).match(".*'(.*)'.*")?.[1].replace(/\//gi, ".") ?? exception
                                const path_value = _.get(this.state.notebook, failing_path, "Not Found")
                                console.log(String(exception).match(".*'(.*)'.*")?.[1].replace(/\//gi, ".") ?? exception, failing_path, typeof failing_path)
                                const ignore = should_ignore_patch_error(failing_path)

                                ;(ignore ? console.log : console.error)(
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

                                if (ignore) {
                                    console.info("Safe to ignore this patch failure...")
                                } else if (this.state.connected) {
                                    console.error("Trying to recover: Refetching notebook...")
                                    this.client.send(
                                        "reset_shared_state",
                                        {},
                                        {
                                            notebook_id: this.state.notebook.notebook_id,
                                        },
                                        false
                                    )
                                } else if (this.state.static_preview && launch_params.slider_server_url != null) {
                                    open_pluto_popup({
                                        type: "warn",
                                        body: html`Something went wrong while updating the notebook state. Please refresh the page to try again.`,
                                    })
                                } else {
                                    console.error("Trying to recover: reloading...")
                                    window.parent.location.href = this.state.refresh_target ?? window.location.href
                                }
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
                const show_debugs = launch_params.binder_url != null
                if (show_debugs) console.debug("on_update", update, by_me)
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
                if (show_debugs) console.debug("on_update done")
            } else {
                // Update for a different notebook, TODO maybe log this as it shouldn't happen
            }
        }

        const on_establish_connection = async (client) => {
            // nasty
            Object.assign(this.client, client)
            try {
                const environment = await get_environment(client)
                const { custom_editor_header_component, custom_non_cell_output } = environment({ client, editor: this, imports: { preact } })
                this.setState({
                    extended_components: {
                        ...this.state.extended_components,
                        CustomHeader: custom_editor_header_component,
                        NonCellOutputComponents: custom_non_cell_output,
                    },
                })
            } catch (e) {}

            // @ts-ignore
            window.version_info = this.client.version_info // for debugging
            // @ts-ignore
            window.kill_socket = this.client.kill // for debugging

            if (!client.notebook_exists) {
                console.error("Notebook does not exist. Not connecting.")
                return
            }
            console.debug("Sending update_notebook request...")
            await this.client.send("update_notebook", { updates: [] }, { notebook_id: this.state.notebook.notebook_id }, false)
            console.debug("Received update_notebook request")

            this.setState({
                initializing: false,
                static_preview: false,
                backend_launch_phase: this.state.backend_launch_phase == null ? null : BackendLaunchPhase.ready,
            })

            // TODO Do this from julia itself
            this.client.send("complete", { query: "sq" }, { notebook_id: this.state.notebook.notebook_id })
            this.client.send("complete", { query: "\\sq" }, { notebook_id: this.state.notebook.notebook_id })

            setTimeout(init_feedback, 2 * 1000) // 2 seconds - load feedback a little later for snappier UI
        }

        const on_connection_status = (val, hopeless) => {
            this.setState({ connected: val })
            if (hopeless) {
                // https://github.com/fonsp/Pluto.jl/issues/55
                // https://github.com/fonsp/Pluto.jl/issues/2398
                open_pluto_popup({
                    type: "warn",
                    body: html`<p>A new server was started - this notebook session is no longer running.</p>
                        <p>Would you like to go back to the main menu?</p>
                        <br />
                        <a href="./">Go back</a>
                        <br />
                        <a
                            href="#"
                            onClick=${(e) => {
                                e.preventDefault()
                                window.dispatchEvent(new CustomEvent("close pluto popup"))
                            }}
                            >Stay here</a
                        >`,
                    should_focus: false,
                })
            }
        }

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

        this.connect = (/** @type {string | undefined} */ ws_address = undefined) =>
            create_pluto_connection({
                ws_address: ws_address,
                on_unrequested_update: on_update,
                on_connection_status: on_connection_status,
                on_reconnect: on_reconnect,
                connect_metadata: { notebook_id: this.state.notebook.notebook_id },
            }).then(on_establish_connection)

        this.on_disable_ui = () => {
            set_disable_ui_css(this.state.disable_ui)

            // Pluto has three modes of operation:
            // 1. (normal) Connected to a Pluto notebook.
            // 2. Static HTML with PlutoSliderServer. All edits are ignored, but bond changes are processes by the PlutoSliderServer.
            // 3. Static HTML without PlutoSliderServer. All interactions are ignored.
            //
            // To easily support all three with minimal changes to the source code, we sneakily swap out the `this.actions` object (`pluto_actions` in other source files) with a different one:
            Object.assign(
                this.actions,
                // if we have no pluto server...
                this.state.disable_ui || (launch_params.slider_server_url != null && !this.state.connected)
                    ? // then use a modified set of actions
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
                    : // otherwise, use the real actions
                      this.real_actions
            )
        }
        this.on_disable_ui()

        setInterval(() => {
            if (!this.state.static_preview && document.visibilityState === "visible") {
                // view stats on https://stats.plutojl.org/
                //@ts-ignore
                count_stat(`editing/${window?.version_info?.pluto ?? this.state.notebook.pluto_version ?? "unknown"}${window.plutoDesktop ? "-desktop" : ""}`)
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
        /** Whether we just set a bond value which will trigger a cell to run, but we are still waiting for the server to process the bond value (and run the cell). During this time, we won't send new bond values. See https://github.com/fonsp/Pluto.jl/issues/1891 for more info. */
        this.waiting_for_bond_to_trigger_execution = false
        /** Number of local updates that have not yet been applied to the server's state. */
        this.pending_local_updates = 0
        /**
         * User scripts that are currently running (possibly async).
         * @type {SetWithEmptyCallback<HTMLElement>}
         */
        this.js_init_set = new SetWithEmptyCallback(() => {
            // console.info("All scripts finished!")
            this.send_queued_bond_changes()
        })

        // @ts-ignore This is for tests
        document.body._js_init_set = this.js_init_set

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

        const bond_will_trigger_evaluation = (/** @type {string|PropertyKey} */ sym) =>
            Object.entries(this.state.notebook.cell_dependencies).some(([cell_id, deps]) => {
                // if the other cell depends on the variable `sym`...
                if (deps.upstream_cells_map.hasOwnProperty(sym)) {
                    // and the cell is not disabled
                    const running_disabled = this.state.notebook.cell_inputs[cell_id].metadata.disabled
                    return !running_disabled
                }
            })

        /**
         * We set `waiting_for_bond_to_trigger_execution` to `true` if it is *guaranteed* that this bond change will trigger something to happen (i.e. a cell to run). See https://github.com/fonsp/Pluto.jl/pull/1892 for more info about why.
         *
         * This is guaranteed if there is a cell in the notebook that references the bound variable. We use our copy of the notebook's toplogy to check this.
         *
         * # Gotchas:
         * 1. We (the frontend) might have an out-of-date copy of the notebook's topology: this bond might have dependents *right now*, but the backend might already be processing a code change that removes that dependency.
         *
         *     However, this change in topology will result in a patch, which will set `waiting_for_bond_to_trigger_execution` back to `false`.
         *
         * 2. The backend has a "first value" mechanism: if bond values are being set for the first time *and* this value is already set on the backend, then the value will be skipped. See https://github.com/fonsp/Pluto.jl/issues/275. If all bond values are skipped, then we might get zero patches back (because no cells will run).
         *
         *     A bond value is considered a "first value" if it is sent using an `"add"` patch. This is why we require `x.op === "replace"`.
         */
        const bond_patch_will_trigger_evaluation = (/** @type {Patch} */ x) =>
            x.op === "replace" && x.path.length >= 1 && bond_will_trigger_evaluation(x.path[1])

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
                        let previous_function_name = new Error().stack?.split("\n")[2].trim().split(" ")[1]
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
                    this.waiting_for_bond_to_trigger_execution =
                        this.waiting_for_bond_to_trigger_execution || changes_involving_bonds.some(bond_patch_will_trigger_evaluation)
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
                    // this property is used to tell our frontend tests that the updates are done
                    //@ts-ignore
                    document.body._update_is_ongoing = this.pending_local_updates > 0
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

        this.desktop_submit_file_change = async () => {
            this.setState({ moving_file: true })
            /**
             * `window.plutoDesktop?.ipcRenderer` is basically what allows the
             * frontend to communicate with the electron side. It is an IPC
             * bridge between render process and main process. More info
             * [here](https://www.electronjs.org/docs/latest/api/ipc-renderer).
             *
             * "PLUTO-MOVE-NOTEBOOK" is an event triggered in the main process
             * once the move is complete, we listen to it using `once`.
             * More info [here](https://www.electronjs.org/docs/latest/api/ipc-renderer#ipcrendereroncechannel-listener)
             */
            window.plutoDesktop?.ipcRenderer.once("PLUTO-MOVE-NOTEBOOK", async (/** @type {string?} */ loc) => {
                if (!!loc)
                    await this.setStatePromise(
                        immer((/** @type {EditorState} */ state) => {
                            state.notebook.in_temp_dir = false
                            state.notebook.path = loc
                        })
                    )
                this.setState({ moving_file: false })
                // @ts-ignore
                document.activeElement?.blur()
            })

            // ask the electron backend to start moving the notebook. The event above will be fired once it is done.
            window.plutoDesktop?.fileSystem.moveNotebook()
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
        this.move_selected = (/** @type {KeyboardEvent} */ e, /** @type {1|-1} */ delta) => {
            if (this.state.selected_cells.length > 0) {
                const current_indices = this.state.selected_cells.map((id) => this.state.notebook.cell_order.indexOf(id))
                const new_index = (delta > 0 ? Math.max : Math.min)(...current_indices) + (delta === -1 ? -1 : 2)

                e.preventDefault()
                return this.actions.move_remote_cells(this.state.selected_cells, new_index).then(
                    // scroll into view
                    () => {
                        document.getElementById((delta > 0 ? _.last : _.first)(this.state.selected_cells) ?? "")?.scrollIntoView({ block: "nearest" })
                    }
                )
            }
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
                document.body.querySelectorAll("[data-pluto-variable], [data-cell-variable]").forEach((el) => {
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
            if (e.key?.toLowerCase() === "q" && has_ctrl_or_cmd_pressed(e)) {
                // This one can't be done as cmd+q on mac, because that closes chrome - Dral
                if (Object.values(this.state.notebook.cell_results).some((c) => c.running || c.queued)) {
                    this.actions.interrupt_remote()
                }
                e.preventDefault()
            } else if (e.key?.toLowerCase() === "s" && has_ctrl_or_cmd_pressed(e)) {
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
            } else if (e.key === "ArrowUp" && e.altKey) {
                this.move_selected(e, -1)
            } else if (e.key === "ArrowDown" && e.altKey) {
                this.move_selected(e, 1)
            } else if ((e.key === "?" && has_ctrl_or_cmd_pressed(e)) || e.key === "F1") {
                // On mac "cmd+shift+?" is used by chrome, so that is why this needs to be ctrl as well on mac
                // Also pressing "ctrl+shift" on mac causes the key to show up as "/", this madness
                // I hope we can find a better solution for this later - Dral
                alert(
                    `Shortcuts 🎹

    ⇧${and}Enter:   run cell
    ${ctrl_or_cmd_name}${and}Enter:   run cell and add cell below
    ${ctrl_or_cmd_name}${and}S:   submit all changes
    Delete or Backspace:   delete empty cell

    page up or fn${and}↑:   jump to cell above
    page down or fn${and}↓:   jump to cell below
    ${alt_or_options_name}${and}↑:   move line/cell up
    ${alt_or_options_name}${and}↓:   move line/cell down

    
    Select multiple cells by dragging a selection box from the space between cells.
    ${ctrl_or_cmd_name}${and}C:   copy selected cells
    ${ctrl_or_cmd_name}${and}X:   cut selected cells
    ${ctrl_or_cmd_name}${and}V:   paste selected cells
    
    ${control_name}${and}M:   toggle markdown
    ${ctrl_or_cmd_name}${and}Q:   interrupt notebook

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

            if (this.state.disable_ui && this.state.backend_launch_phase === BackendLaunchPhase.wait_for_user) {
                // const code = e.key?.charCodeAt(0)
                if (e.key === "Enter" || e.key?.length === 1) {
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
                    e.preventDefault()
                    // wait one frame to get transient user activation
                    requestAnimationFrame(() =>
                        navigator.clipboard.writeText(serialized).catch((err) => {
                            console.error("Error copying cells", e, err, navigator.userActivation)
                            alert(`Error copying cells: ${err?.message ?? err}`)
                        })
                    )
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
            const topaste = e.clipboardData?.getData("text/plain")
            if (topaste) {
                const deserializer = detect_deserializer(topaste)
                if (deserializer != null) {
                    this.actions.add_deserialized_cells(topaste, -1, deserializer)
                    e.preventDefault()
                }
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
        const lp = this.props.launch_params
        if (this.state.static_preview) {
            this.setState({
                initializing: false,
            })

            // view stats on https://stats.plutojl.org/
            count_stat(
                lp.pluto_server_url != null
                    ? // record which featured notebook was viewed, e.g. basic/Markdown.jl
                      `featured-view${lp.notebookfile != null ? new URL(lp.notebookfile).pathname : ""}`
                    : // @ts-ignore
                      `article-view/${window?.version_info?.pluto ?? this.state.notebook.pluto_version ?? "unknown"}`
            )
        } else {
            this.connect(lp.pluto_server_url ? ws_address_from_base(lp.pluto_server_url) : undefined)
        }
    }

    componentDidUpdate(old_props, old_state) {
        //@ts-ignore
        window.editor_state = this.state
        //@ts-ignore
        window.editor_state_set = this.setStatePromise

        const new_state = this.state

        if (old_state?.notebook?.path !== new_state.notebook.path) {
            update_stored_recent_notebooks(new_state.notebook.path, old_state?.notebook?.path)
        }
        if (old_state?.notebook?.shortpath !== new_state.notebook.shortpath) {
            document.title = "🎈 " + new_state.notebook.shortpath + " — Pluto.jl"
        }

        this.send_queued_bond_changes()

        if (old_state.backend_launch_phase !== this.state.backend_launch_phase && this.state.backend_launch_phase != null) {
            const phase = Object.entries(BackendLaunchPhase).find(([k, v]) => v == this.state.backend_launch_phase)?.[0]
            console.info(`Binder phase: ${phase} at ${new Date().toLocaleTimeString()}`)
        }

        if (old_state.disable_ui !== this.state.disable_ui || old_state.connected !== this.state.connected) {
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
                <${PlutoActionsContext.Provider} value=${this.actions}>
                    <${PlutoBondsContext.Provider} value=${this.state.notebook.bonds}>
                        <${PlutoJSInitializingContext.Provider} value=${this.js_init_set}>
                            <${ProgressBar} notebook=${this.state.notebook} backend_launch_phase=${this.state.backend_launch_phase} status=${status}/>
                            <div style="width: 100%">
                                ${this.state.notebook.cell_order.map(
                                    (cell_id, i) => html`
                                        <${IsolatedCell}
                                            cell_input=${notebook.cell_inputs[cell_id]}
                                            cell_result=${this.state.notebook.cell_results[cell_id]}
                                            hidden=${!launch_params.isolated_cell_ids?.includes(cell_id)}
                                            sanitize_html=${status.sanitize_html}
                                        />
                                    `
                                )}
                            </div>
                        </${PlutoJSInitializingContext.Provider}>
                    </${PlutoBondsContext.Provider}>
                </${PlutoActionsContext.Provider}>
            `
        }

        const warn_about_untrusted_code = this.client.session_options?.security?.warn_about_untrusted_code ?? true

        const restart = async (maybe_confirm = false) => {
            let source = notebook.metadata?.risky_file_source
            if (
                !warn_about_untrusted_code ||
                !maybe_confirm ||
                source == null ||
                confirm(`⚠️ Danger! Are you sure that you trust this file? \n\n${source}\n\nA malicious notebook can steal passwords and data.`)
            ) {
                await this.actions.update_notebook((notebook) => {
                    delete notebook.metadata.risky_file_source
                })
                await this.client.send(
                    "restart_process",
                    {},
                    {
                        notebook_id: notebook.notebook_id,
                    }
                )
            }
        }

        const restart_button = (text, maybe_confirm = false) =>
            html`<a href="#" id="restart-process-button" onClick=${() => restart(maybe_confirm)}>${text}</a>`

        return html`
            ${this.state.disable_ui === false && html`<${HijackExternalLinksToOpenInNewTab} />`}
            
            <${PlutoActionsContext.Provider} value=${this.actions}>
                <${PlutoBondsContext.Provider} value=${this.state.notebook.bonds}>
                    <${PlutoJSInitializingContext.Provider} value=${this.js_init_set}>
                    ${
                        status.static_preview && status.offer_local
                            ? html`<button
                                  title="Go back"
                                  onClick=${() => {
                                      history.back()
                                  }}
                                  class="floating_back_button"
                              >
                                  <span></span>
                              </button>`
                            : null
                    }
                    <${Scroller} active=${this.state.scroller} />
                    <${ProgressBar} notebook=${this.state.notebook} backend_launch_phase=${this.state.backend_launch_phase} status=${status}/>
                    <header id="pluto-nav" className=${export_menu_open ? "show_export" : ""}>
                        <${ExportBanner}
                            notebook_id=${this.state.notebook.notebook_id}
                            print_title=${
                                this.state.notebook.metadata?.frontmatter?.title ??
                                new URLSearchParams(window.location.search).get("name") ??
                                this.state.notebook.shortpath
                            }
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
                                this.state.binder_session_url != null ? `${this.state.binder_session_url}?token=${this.state.binder_session_token}` : "./"
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
                                          on_desktop_submit=${this.desktop_submit_file_change}
                                          suggest_new_file=${{
                                              base: this.client.session_options?.server?.notebook_path_suggestion ?? "",
                                              name: notebook.shortpath,
                                          }}
                                          placeholder="Save notebook..."
                                          button_label=${notebook.in_temp_dir ? "Choose" : "Move"}
                                      />`)
                            }
                            <div class="flex_grow_2"></div>
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
                                    : statusval === "process_waiting_for_permission"
                                    ? html`${restart_button("Run notebook code", true)}`
                                    : null
                            }</div>
                            <button class="toggle_export" title="Export..." onClick=${() => {
                                this.setState({ export_menu_open: !export_menu_open })
                            }}><span></span></button>
                        </nav>
                    </header>
                    
                    <${SafePreviewUI}
                        process_waiting_for_permission=${status.process_waiting_for_permission}
                        risky_file_source=${notebook.metadata?.risky_file_source}
                        restart=${restart}
                        warn_about_untrusted_code=${warn_about_untrusted_code}
                    />
                    
                    <${RecordingUI} 
                        notebook_name=${notebook.shortpath}
                        recording_waiting_to_start=${this.state.recording_waiting_to_start}
                        set_recording_states=${({ is_recording, recording_waiting_to_start }) => this.setState({ is_recording, recording_waiting_to_start })}
                        is_recording=${this.state.is_recording}
                        patch_listeners=${this.patch_listeners}
                        export_url=${this.export_url}
                    />
                    <${RecordingPlaybackUI} 
                        launch_params=${launch_params}
                        initializing=${this.state.initializing}
                        apply_notebook_patches=${this.apply_notebook_patches}
                        reset_notebook_state=${() =>
                            this.setStatePromise(
                                immer((/** @type {EditorState} */ state) => {
                                    state.notebook = this.props.initial_notebook_state
                                })
                            )}
                    />
                    <${EditorLaunchBackendButton} editor=${this} launch_params=${launch_params} status=${status} />
                    <${FrontMatterInput}
                        filename=${notebook.shortpath}
                        remote_frontmatter=${notebook.metadata?.frontmatter} 
                        set_remote_frontmatter=${(newval) =>
                            this.actions.update_notebook((nb) => {
                                nb.metadata["frontmatter"] = newval
                            })} 
                    />
                    ${this.props.preamble_element}
                    <${Main}>
                        <${Preamble}
                            last_update_time=${this.state.last_update_time}
                            any_code_differs=${status.code_differs}
                            last_hot_reload_time=${notebook.last_hot_reload_time}
                            connected=${this.state.connected}
                        />
                        <${Notebook}
                            notebook=${notebook}
                            cell_inputs_local=${this.state.cell_inputs_local}
                            disable_input=${this.state.disable_ui || !this.state.connected /* && this.state.backend_launch_phase == null*/}
                            last_created_cell=${this.state.last_created_cell}
                            selected_cells=${this.state.selected_cells}
                            is_initializing=${this.state.initializing}
                            is_process_ready=${this.is_process_ready()}
                            process_waiting_for_permission=${status.process_waiting_for_permission}
                            sanitize_html=${status.sanitize_html}
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
                        <${NonCellOutput} 
                            notebook_id=${this.state.notebook.notebook_id} 
                            environment_component=${this.state.extended_components.NonCellOutputComponents} />
                    </${Main}>
                    <${BottomRightPanel}
                        desired_doc_query=${this.state.desired_doc_query}
                        on_update_doc_query=${this.actions.set_doc_query}
                        connected=${this.state.connected}
                        backend_launch_phase=${this.state.backend_launch_phase}
                        backend_launch_logs=${this.state.backend_launch_logs}
                        notebook=${this.state.notebook}
                        sanitize_html=${status.sanitize_html}
                    />
                    <${Popup} 
                        notebook=${this.state.notebook}
                        disable_input=${this.state.disable_ui || !this.state.connected /* && this.state.backend_launch_phase == null*/}
                    />
                    <${RecentlyDisabledInfo} 
                        recently_auto_disabled_cells=${this.state.recently_auto_disabled_cells}
                        notebook=${this.state.notebook}
                    />
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
                                <label for="opinion">🙋 How can we make <a href="https://plutojl.org/" target="_blank">Pluto.jl</a> better?</label>
                                <input type="text" name="opinion" id="opinion" autocomplete="off" placeholder="Instant feedback..." />
                                <button>Send</button>
                            </form>
                        </div>
                    </footer>
                </${PlutoJSInitializingContext.Provider}>
                </${PlutoBondsContext.Provider}>
            </${PlutoActionsContext.Provider}>
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
