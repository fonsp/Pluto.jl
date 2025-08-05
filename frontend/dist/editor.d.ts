export function set_disable_ui_css(val: boolean, element: HTMLElement): void;
export function is_editor_embedded_inside_editor(element: HTMLElement): boolean;
export function empty_notebook_state({ notebook_id }: {
    notebook_id: any;
}): import("./components/Editor.js").NotebookData;
