export function UndoDelete({ recently_deleted, on_click }: {
    recently_deleted: any;
    on_click: any;
}): import("../imports/Preact.js").ReactElement;
export function RecentlyDisabledInfo({ notebook, recently_auto_disabled_cells }: {
    notebook: import("./Editor.js").NotebookData;
    recently_auto_disabled_cells: Record<string, [string, string]>;
}): any;
