export function LiveDocsTab({ focus_on_open, desired_doc_query, on_update_doc_query, notebook, sanitize_html }: {
    focus_on_open: boolean;
    desired_doc_query: string | null;
    on_update_doc_query: (query: string) => void;
    notebook: import("./Editor.js").NotebookData;
    sanitize_html?: boolean;
}): import("../imports/Preact.js").ReactElement;
