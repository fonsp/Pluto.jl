export function RecordingUI({ notebook_name, is_recording, recording_waiting_to_start, set_recording_states, patch_listeners, export_url }: {
    notebook_name: any;
    is_recording: any;
    recording_waiting_to_start: any;
    set_recording_states: any;
    patch_listeners: any;
    export_url: any;
}): import("../imports/Preact.js").ReactElement;
export function RecordingPlaybackUI({ launch_params, initializing, apply_notebook_patches, reset_notebook_state }: {
    launch_params: import("./Editor.js").LaunchParameters;
    initializing: boolean;
    [key: string]: any;
}): import("../imports/Preact.js").ReactElement;
export type PatchStep = [number, any[]?];
export type RecordingData = {
    steps: Array<PatchStep>;
    scrolls: Array<[number, {
        cell_id: string;
        relative_distance: number;
    }]>;
};
export type RecordingState = RecordingData & {
    initial_html: string;
    scroll_handler: (x: number) => void;
    audio_recorder: {
        start: () => void;
        stop: () => Promise<string>;
    } | null;
};
