export function FilePicker({ value, suggest_new_file, button_label, placeholder, on_submit, on_desktop_submit, client, clear_on_blur }: {
    value: string;
    suggest_new_file: {
        base: string;
    };
    button_label: string;
    placeholder: string;
    on_submit: (new_path: string) => Promise<void>;
    on_desktop_submit?: (loc?: string) => Promise<void>;
    client: import("../common/PlutoConnection.js").PlutoConnection;
    clear_on_blur: boolean;
}): import("../imports/Preact.js").ReactElement;
