import PopupSvelte from "./Popup.svelte"
import { pluto_export_to_react } from "./pluto_export_to_react.js"

export const Popup = pluto_export_to_react(PopupSvelte, {
    notebook: "notebook",
    disable_input: "disable_input",
})