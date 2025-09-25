import { pluto_export_to_react } from "../common/SvelteExport.js"
import RawHTMLContainerSvelte from "./RawHTMLContainer.svelte"

export const RawHTMLContainer = pluto_export_to_react(RawHTMLContainerSvelte, [
    "cell_id",
    "body", 
    "className",
    "persist_js_state",
    "last_run_timestamp",
    "sanitize_html",
    "sanitize_html_message"
])