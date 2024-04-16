/**
 *
 * @return {import("../components/Editor.js").LaunchParameters}
 */
export const parse_launch_params = () => {
    const url_params = new URLSearchParams(window.location.search)

    return {
        //@ts-ignore
        notebook_id: url_params.get("id") ?? window.pluto_notebook_id,
        //@ts-ignore
        statefile: url_params.get("statefile") ?? window.pluto_statefile,
        //@ts-ignore
        statefile_integrity: url_params.get("statefile_integrity") ?? window.pluto_statefile_integrity,
        //@ts-ignore
        notebookfile: url_params.get("notebookfile") ?? window.pluto_notebookfile,
        //@ts-ignore
        notebookfile_integrity: url_params.get("notebookfile_integrity") ?? window.pluto_notebookfile_integrity,
        //@ts-ignore
        disable_ui: !!(url_params.get("disable_ui") ?? window.pluto_disable_ui),
        //@ts-ignore
        preamble_html: url_params.get("preamble_html") ?? window.pluto_preamble_html,
        //@ts-ignore
        isolated_cell_ids: url_params.has("isolated_cell_id") ? url_params.getAll("isolated_cell_id") : window.pluto_isolated_cell_ids,
        //@ts-ignore
        binder_url: url_params.get("binder_url") ?? window.pluto_binder_url,
        //@ts-ignore
        pluto_server_url: url_params.get("pluto_server_url") ?? window.pluto_pluto_server_url,
        //@ts-ignore
        slider_server_url: url_params.get("slider_server_url") ?? window.pluto_slider_server_url,
        //@ts-ignore
        recording_url: url_params.get("recording_url") ?? window.pluto_recording_url,
        //@ts-ignore
        recording_url_integrity: url_params.get("recording_url_integrity") ?? window.pluto_recording_url_integrity,
        //@ts-ignore
        recording_audio_url: url_params.get("recording_audio_url") ?? window.pluto_recording_audio_url,
    }
}
