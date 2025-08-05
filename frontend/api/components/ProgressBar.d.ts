export function ProgressBar({ notebook, backend_launch_phase, status }: {
    notebook: import("./Editor.js").NotebookData;
    backend_launch_phase: number | null;
    status: Record<string, any>;
}): import("../imports/Preact.js").ReactElement;
export function scroll_to_busy_cell(notebook: any): void;
