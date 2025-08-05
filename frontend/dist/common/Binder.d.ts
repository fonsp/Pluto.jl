export namespace BackendLaunchPhase {
    let wait_for_user: number;
    let requesting: number;
    let created: number;
    let responded: number;
    let notebook_running: number;
    let ready: number;
}
export function trailingslash(s: any): any;
export function request_binder(build_url: any, { on_log }: {
    on_log: any;
}): Promise<any>;
export function count_stat(page: any): Promise<void | Response>;
export function start_binder({ setStatePromise, connect, launch_params }: {
    setStatePromise: any;
    connect: any;
    launch_params: any;
}): Promise<void>;
