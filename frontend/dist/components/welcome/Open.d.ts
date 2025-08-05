export function Open({ client, connected, CustomPicker, show_samples, on_start_navigation }: {
    client: import("../../common/PlutoConnection.js").PlutoConnection | null;
    connected: boolean;
    show_samples: boolean;
    CustomPicker: {
        text: string;
        placeholder: string;
    } | null;
    on_start_navigation: (string: any) => void;
}): import("../../imports/Preact.js").ReactElement;
export function link_open_path(path: any, execution_allowed?: boolean): string;
export function link_open_url(url: any): string;
export function link_edit(notebook_id: any): string;
