export function ParseError({ cell_id, diagnostics, last_run_timestamp }: {
    cell_id: any;
    diagnostics: any;
    last_run_timestamp: any;
}): import("../imports/Preact.js").ReactElement;
export function ErrorMessage({ msg, stacktrace, plain_error, cell_id }: {
    msg: any;
    stacktrace: any;
    plain_error: any;
    cell_id: any;
}): import("../imports/Preact.js").ReactElement;
