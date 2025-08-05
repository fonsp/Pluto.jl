export const default_path: "";
export const url_logo_small: any;
/**
 * @typedef EditorProps
 * @type {{
 * launch_params: LaunchParameters,
 * initial_notebook_state: NotebookData,
 * preamble_element: preact.ReactElement?,
 * pluto_editor_element: HTMLElement,
 * }}
 */
/**
 * @typedef EditorState
 * @type {{
 * notebook: NotebookData,
 * cell_inputs_local: { [uuid: string]: { code: String } },
 * unsumbitted_global_definitions: { [uuid: string]: String[] }
 * desired_doc_query: ?String,
 * recently_deleted: ?Array<{ index: number, cell: CellInputData }>,
 * recently_auto_disabled_cells: Record<string,[string,string]>,
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
 * slider_server: { connecting: boolean, interactive: boolean },
 * }}
 */
/**
 * @augments Component<EditorProps,EditorState>
 */
export class Editor {
    constructor(props: EditorProps);
    /** @type {EditorState} */
    state: EditorState;
    setStatePromise: (fn: any) => Promise<any>;
    real_actions: {
        get_notebook: () => {};
        get_session_options: () => Record<string, any>;
        get_launch_params: () => any;
        send: (message_type: any, ...args: any[]) => any;
        get_published_object: (objectid: any) => any;
        update_notebook: (...args: any[]) => Promise<void>;
        set_doc_query: (query: any) => any;
        set_local_cell: (cell_id: any, new_val: any) => Promise<any>;
        set_unsubmitted_global_definitions: (cell_id: any, new_val: any) => Promise<any>;
        get_unsubmitted_global_definitions: () => any;
        focus_on_neighbor: (cell_id: any, delta: any, line?: number, ch?: number) => void;
        add_deserialized_cells: (data: any, index_or_id: any, deserializer?: any) => Promise<void>;
        wrap_remote_cell: (cell_id: any, block_start?: string, block_end?: string) => Promise<void>;
        split_remote_cell: (cell_id: any, boundaries: any, submit?: boolean) => Promise<void>;
        interrupt_remote: (cell_id: any) => void;
        move_remote_cells: (cell_ids: any, new_index: any) => Promise<void>;
        add_remote_cell_at: (index: any, code?: string) => Promise<string>;
        add_remote_cell: (cell_id: any, before_or_after: any, code: any) => Promise<string>;
        confirm_delete_multiple: (verb: any, cell_ids: any) => Promise<void>;
        fold_remote_cells: (cell_ids: any, new_value: any) => Promise<void>;
        set_and_run_all_changed_remote_cells: () => boolean;
        set_and_run_multiple: (cell_ids: any) => Promise<void>;
        /**
         *
         * @param {string} name name of bound variable
         * @param {*} value value (not in wrapper object)
         */
        set_bond: (name: string, value: any) => Promise<void>;
        reshow_cell: (cell_id: any, objectid: any, dim: any) => any;
        request_js_link_response: (cell_id: any, link_id: any, input: any) => any;
        /** This actions avoids pushing selected cells all the way down, which is too heavy to handle! */
        get_selected_cells: (cell_id: any, allow_other_selected_cells: boolean) => any[];
        get_avaible_versions: ({ package_name, notebook_id }: {
            package_name: any;
            notebook_id: any;
        }) => Promise<any>;
    };
    actions: {
        get_notebook: () => {};
        get_session_options: () => Record<string, any>;
        get_launch_params: () => any;
        send: (message_type: any, ...args: any[]) => any;
        get_published_object: (objectid: any) => any;
        update_notebook: (...args: any[]) => Promise<void>;
        set_doc_query: (query: any) => any;
        set_local_cell: (cell_id: any, new_val: any) => Promise<any>;
        set_unsubmitted_global_definitions: (cell_id: any, new_val: any) => Promise<any>;
        get_unsubmitted_global_definitions: () => any;
        focus_on_neighbor: (cell_id: any, delta: any, line?: number, ch?: number) => void;
        add_deserialized_cells: (data: any, index_or_id: any, deserializer?: any) => Promise<void>;
        wrap_remote_cell: (cell_id: any, block_start?: string, block_end?: string) => Promise<void>;
        split_remote_cell: (cell_id: any, boundaries: any, submit?: boolean) => Promise<void>;
        interrupt_remote: (cell_id: any) => void;
        move_remote_cells: (cell_ids: any, new_index: any) => Promise<void>;
        add_remote_cell_at: (index: any, code?: string) => Promise<string>;
        add_remote_cell: (cell_id: any, before_or_after: any, code: any) => Promise<string>;
        confirm_delete_multiple: (verb: any, cell_ids: any) => Promise<void>;
        fold_remote_cells: (cell_ids: any, new_value: any) => Promise<void>;
        set_and_run_all_changed_remote_cells: () => boolean;
        set_and_run_multiple: (cell_ids: any) => Promise<void>;
        /**
         *
         * @param {string} name name of bound variable
         * @param {*} value value (not in wrapper object)
         */
        set_bond: (name: string, value: any) => Promise<void>;
        reshow_cell: (cell_id: any, objectid: any, dim: any) => any;
        request_js_link_response: (cell_id: any, link_id: any, input: any) => any;
        /** This actions avoids pushing selected cells all the way down, which is too heavy to handle! */
        get_selected_cells: (cell_id: any, allow_other_selected_cells: boolean) => any[];
        get_avaible_versions: ({ package_name, notebook_id }: {
            package_name: any;
            notebook_id: any;
        }) => Promise<any>;
    };
    apply_notebook_patches: (patches: any, old_state?: NotebookData | null, get_reverse_patches?: boolean) => Promise<any>;
    last_update_counter: number;
    waiting_for_bond_to_trigger_execution: boolean;
    export_url: (u: string) => string;
    /** @type {import('../common/PlutoConnection').PlutoConnection} */
    client: import("../common/PlutoConnection").PlutoConnection;
    connect: (ws_address?: string | undefined) => Promise<void>;
    on_disable_ui: () => void;
    /** Patches that are being delayed until all cells have finished running. */
    bond_changes_to_apply_when_done: any[];
    maybe_send_queued_bond_changes: () => void;
    /** Number of local updates that have not yet been applied to the server's state. */
    pending_local_updates: number;
    /**
     * User scripts that are currently running (possibly async).
     * @type {SetWithEmptyCallback<HTMLElement>}
     */
    js_init_set: SetWithEmptyCallback<HTMLElement>;
    /** Is the notebook ready to execute code right now? (i.e. are no cells queued or running?) */
    notebook_is_idle: () => boolean;
    is_process_ready: () => boolean;
    update_notebook: (mutate_fn: (notebook: NotebookData) => void) => Promise<void>;
    close: () => void;
    submit_file_change: (new_path: any, reset_cm_value: any) => Promise<void>;
    desktop_submit_file_change: () => Promise<void>;
    delete_selected: (verb: any) => boolean;
    run_selected: () => Promise<void>;
    fold_selected: (new_val: any) => Promise<void>;
    move_selected: (e: KeyboardEvent, delta: 1 | -1) => Promise<void>;
    serialize_selected: (cell_id?: string | null) => any;
    patch_listeners: any[];
    on_patches_hook: (patches: any) => void;
    componentDidMount(): void;
    componentDidUpdate(old_props: EditorProps, old_state: EditorState): void;
    componentWillUpdate(new_props: any, new_state: any): void;
    cached_status: {
        disconnected: boolean;
        loading: boolean;
        process_waiting_for_permission: boolean;
        process_restarting: boolean;
        process_dead: boolean;
        nbpkg_restart_required: boolean;
        nbpkg_restart_recommended: boolean;
        nbpkg_disabled: boolean;
        static_preview: boolean;
        bonds_disabled: boolean;
        offer_binder: boolean;
        offer_local: boolean;
        binder: boolean;
        code_differs: boolean;
        recording_waiting_to_start: boolean;
        is_recording: boolean;
        isolated_cell_view: boolean;
        sanitize_html: boolean;
    };
    render(): any;
}
export function update_stored_recent_notebooks(recent_path: any, also_delete?: string | undefined): void;
export type Patch = any;
export type CellMetaData = {
    disabled: boolean;
    show_logs: boolean;
    skip_as_script: boolean;
};
export type CellInputData = {
    cell_id: string;
    code: string;
    code_folded: boolean;
    metadata: CellMetaData;
};
export type LogEntryData = {
    level: number;
    msg: string;
    file: string;
    line: number;
    kwargs: any;
};
export type StatusEntryData = {
    name: string;
    success?: boolean;
    started_at: number | null;
    finished_at: number | null;
    timing?: "remote" | "local";
    subtasks: Record<string, StatusEntryData>;
};
export type CellResultData = {
    cell_id: string;
    queued: boolean;
    running: boolean;
    errored: boolean;
    runtime: number | null;
    downstream_cells_map: {
        [variable: string]: [string];
    };
    upstream_cells_map: {
        [variable: string]: [string];
    };
    precedence_heuristic: number | null;
    depends_on_disabled_cells: boolean;
    depends_on_skipped_cells: boolean;
    output: {
        body: string | any;
        persist_js_state: boolean;
        last_run_timestamp: number;
        mime: string;
        rootassignee: string | null;
        has_pluto_hook_features: boolean;
    };
    logs: Array<LogEntryData>;
    published_object_keys: [string];
};
export type CellDependencyData = {
    cell_id: string;
    /**
     * A map where the keys are the variables *defined* by this cell, and a value is the list of cell IDs that reference a variable.
     */
    downstream_cells_map: Record<string, Array<string>>;
    /**
     * A map where the keys are the variables *referenced* by this cell, and a value is the list of cell IDs that define a variable.
     */
    upstream_cells_map: Record<string, Array<string>>;
    precedence_heuristic: number;
};
export type CellDependencyGraph = {
    [uuid: string]: CellDependencyData;
};
export type NotebookPkgData = {
    enabled: boolean;
    waiting_for_permission: boolean | null;
    waiting_for_permission_but_probably_disabled: boolean | null;
    restart_recommended_msg: string | null;
    restart_required_msg: string | null;
    installed_versions: {
        [pkg_name: string]: string;
    };
    terminal_outputs: {
        [pkg_name: string]: string;
    };
    install_time_ns: number | null;
    busy_packages: string[];
    instantiated: boolean;
};
export type LaunchParameters = {
    notebook_id: string | null;
    statefile: string | null;
    statefile_integrity: string | null;
    notebookfile: string | null;
    notebookfile_integrity: string | null;
    disable_ui: boolean;
    preamble_html: string | null;
    isolated_cell_ids: string[] | null;
    binder_url: string | null;
    pluto_server_url: string | null;
    slider_server_url: string | null;
    recording_url: string | null;
    recording_url_integrity: string | null;
    recording_audio_url: string | null;
};
export type BondValueContainer = {
    value: any;
};
export type BondValuesDict = {
    [name: string]: BondValueContainer;
};
export type NotebookData = {
    pluto_version?: string;
    notebook_id: string;
    path: string;
    shortpath: string;
    in_temp_dir: boolean;
    process_status: string;
    last_save_time: number;
    last_hot_reload_time: number;
    cell_inputs: {
        [uuid: string]: CellInputData;
    };
    cell_results: {
        [uuid: string]: CellResultData;
    };
    cell_dependencies: CellDependencyGraph;
    cell_order: Array<string>;
    cell_execution_order: Array<string>;
    published_objects: {
        [objectid: string]: any;
    };
    bonds: BondValuesDict;
    nbpkg: NotebookPkgData | null;
    metadata: object;
    status_tree: StatusEntryData | null;
};
export type EditorProps = {
    launch_params: LaunchParameters;
    initial_notebook_state: NotebookData;
    preamble_element: preact.ReactElement | null;
    pluto_editor_element: HTMLElement;
};
export type EditorState = {
    notebook: NotebookData;
    cell_inputs_local: {
        [uuid: string]: {
            code: string;
        };
    };
    unsumbitted_global_definitions: {
        [uuid: string]: string[];
    };
    desired_doc_query: string | null;
    recently_deleted: Array<{
        index: number;
        cell: CellInputData;
    }> | null;
    recently_auto_disabled_cells: Record<string, [string, string]>;
    last_update_time: number;
    disable_ui: boolean;
    static_preview: boolean;
    backend_launch_phase: number | null;
    backend_launch_logs: string | null;
    binder_session_url: string | null;
    binder_session_token: string | null;
    refresh_target: string | null;
    connected: boolean;
    initializing: boolean;
    moving_file: boolean;
    scroller: {
        up: boolean;
        down: boolean;
    };
    export_menu_open: boolean;
    last_created_cell: string | null;
    selected_cells: Array<string>;
    extended_components: any;
    is_recording: boolean;
    recording_waiting_to_start: boolean;
    slider_server: {
        connecting: boolean;
        interactive: boolean;
    };
};
