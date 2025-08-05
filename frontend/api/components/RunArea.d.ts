export function RunArea({ runtime, running, queued, code_differs, on_run, on_interrupt, set_cell_disabled, depends_on_disabled_cells, running_disabled, on_jump, }: {
    runtime: any;
    running: any;
    queued: any;
    code_differs: any;
    on_run: any;
    on_interrupt: any;
    set_cell_disabled: any;
    depends_on_disabled_cells: any;
    running_disabled: any;
    on_jump: any;
}): import("../imports/Preact.js").ReactElement;
export function prettytime(time_ns: any): string;
export function useMillisSinceTruthy(truthy: boolean): number;
export function useDebouncedTruth(truthy: any, delay?: number): any;
