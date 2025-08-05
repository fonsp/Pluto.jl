export function StatusTab({ status, notebook, backend_launch_logs, my_clock_is_ahead_by }: {
    status: import("./Editor.js").StatusEntryData;
    notebook: import("./Editor.js").NotebookData;
    backend_launch_logs: string | null;
    my_clock_is_ahead_by: number;
}): import("../imports/Preact.js").ReactElement;
export function friendly_name(task_name: string): string;
export function is_finished(status: import("./Editor.js").StatusEntryData): boolean;
export function is_started(status: import("./Editor.js").StatusEntryData): boolean;
export function is_busy(status: import("./Editor.js").StatusEntryData): boolean;
export function total_done(status: import("./Editor.js").StatusEntryData): number;
export function total_tasks(status: import("./Editor.js").StatusEntryData): number;
export function path_to_first_busy_business(status: import("./Editor.js").StatusEntryData): string[];
export function useStatusItem(name: string, started: boolean, finished: boolean, subtasks?: {}): import("./Editor.js").StatusEntryData;
