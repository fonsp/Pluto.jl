export function downstream_recursive(graph: import("../components/Editor.js").CellDependencyGraph, starts: any, { recursive }?: {
    recursive?: boolean;
}): Set<string>;
export function upstream_recursive(graph: import("../components/Editor.js").CellDependencyGraph, starts: any, { recursive }?: {
    recursive?: boolean;
}): Set<string>;
export function is_noop_action(action: any): boolean;
export function nothing_actions({ actions }: {
    actions: any;
}): {
    [k: string]: any;
};
export function slider_server_actions({ setStatePromise, launch_params, actions, get_original_state, get_current_state, apply_notebook_patches }: {
    setStatePromise: any;
    launch_params: any;
    actions: any;
    get_original_state: any;
    get_current_state: any;
    apply_notebook_patches: any;
}): {
    set_bond: (symbol: any, value: any) => Promise<void>;
};
