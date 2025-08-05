export function open_bottom_right_panel(tab: PanelTabName): boolean;
export function BottomRightPanel({ desired_doc_query, on_update_doc_query, notebook, connected, backend_launch_phase, backend_launch_logs, sanitize_html, }: {
    notebook: import("./Editor.js").NotebookData;
    desired_doc_query: string | null;
    on_update_doc_query: (query: string | null) => void;
    connected: boolean;
    backend_launch_phase: number | null;
    backend_launch_logs: string | null;
    sanitize_html?: boolean;
}): import("../imports/Preact.js").ReactElement;
export function useDelayedTruth(x: boolean, timeout: number): boolean;
export type PanelTabName = "docs" | "process" | null;
