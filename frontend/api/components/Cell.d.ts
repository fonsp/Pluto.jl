export function Cell({ cell_input: { cell_id, code, code_folded, metadata }, cell_result: { queued, running, runtime, errored, output, logs, published_object_keys, depends_on_disabled_cells, depends_on_skipped_cells }, cell_dependencies, cell_input_local, notebook_id, selected, force_hide_input, focus_after_creation, is_process_ready, disable_input, process_waiting_for_permission, sanitize_html, nbpkg, global_definition_locations, is_first_cell, }: {
    cell_result: import("./Editor.js").CellResultData;
    cell_input: import("./Editor.js").CellInputData;
    cell_input_local: {
        code: string;
    };
    cell_dependencies: import("./Editor.js").CellDependencyData;
    nbpkg: import("./Editor.js").NotebookPkgData | null;
    selected: boolean;
    force_hide_input: boolean;
    focus_after_creation: boolean;
    process_waiting_for_permission: boolean;
    sanitize_html: boolean;
    [key: string]: any;
}): import("../imports/Preact.js").ReactElement;
export function IsolatedCell({ cell_input: { cell_id, metadata }, cell_result: { logs, output, published_object_keys }, hidden, sanitize_html }: {
    cell_result: import("./Editor.js").CellResultData;
    cell_input: import("./Editor.js").CellInputData;
    [key: string]: any;
}): import("../imports/Preact.js").ReactElement;
