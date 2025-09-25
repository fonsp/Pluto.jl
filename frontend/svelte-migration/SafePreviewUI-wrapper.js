import { pluto_export_to_react } from "../common/SvelteExport.js"
import SafePreviewUI from "./SafePreviewUI.svelte"

export default pluto_export_to_react(SafePreviewUI, {
    process_waiting_for_permission: true,
    risky_file_source: true,
    restart: true,
    warn_about_untrusted_code: true
})