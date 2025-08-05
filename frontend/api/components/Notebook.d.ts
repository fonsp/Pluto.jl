export function useMemoDebug(fn: any, args: any): any;
export function Notebook({ notebook, cell_inputs_local, last_created_cell, selected_cells, is_initializing, is_process_ready, disable_input, process_waiting_for_permission, sanitize_html, }: {
    notebook: import("./Editor.js").NotebookData;
    cell_inputs_local: {
        [uuid: string]: {
            code: string;
        };
    };
    on_update_doc_query: any;
    on_cell_input: any;
    on_focus_neighbor: any;
    last_created_cell: string;
    selected_cells: Array<string>;
    is_initializing: boolean;
    is_process_ready: boolean;
    disable_input: boolean;
    process_waiting_for_permission: boolean;
    sanitize_html: boolean;
}): import("../imports/Preact.js").ReactElement;
