export function RunLocalButton({ show, start_local }: {
    show: any;
    start_local: any;
}): import("../imports/Preact.js").ReactElement;
export function BinderButton({ offer_binder, start_binder, notebookfile, notebook }: {
    notebook: import("./Editor.js").NotebookData;
    notebookfile: string | null;
    start_binder: () => Promise<void>;
    offer_binder: boolean;
}): import("../imports/Preact.js").ReactElement;
export function pretty_long_time(sec: number): string;
