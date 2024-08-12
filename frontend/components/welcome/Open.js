import _ from "../../imports/lodash.js"
import { html } from "../../imports/Preact.js"

import { FilePicker } from "../FilePicker.js"
import { PasteHandler } from "../PasteHandler.js"
import { guess_notebook_location } from "../../common/NotebookLocationFromURL.js"

/**
 * @param {{
 *  client: import("../../common/PlutoConnection.js").PlutoConnection?,
 *  connected: Boolean,
 *  show_samples: Boolean,
 *  CustomPicker: {text: String, placeholder: String}?,
 *  on_start_navigation: (string) => void,
 * }} props
 */
export const Open = ({ client, connected, CustomPicker, show_samples, on_start_navigation }) => {
    const on_open_path = async (new_path) => {
        const processed = await guess_notebook_location(new_path)
        on_start_navigation(processed.path_or_url)
        window.location.href = (processed.type === "path" ? link_open_path : link_open_url)(processed.path_or_url)
    }

    const desktop_on_open_path = async (_p) => {
        window.plutoDesktop?.fileSystem.openNotebook("path")
    }

    const desktop_on_open_url = async (url) => {
        window.plutoDesktop?.fileSystem.openNotebook("url", url)
    }

    const picker = CustomPicker ?? {
        text: "Open a notebook",
        placeholder: "Enter path or URL...",
    }

    return html`<${PasteHandler} on_start_navigation=${on_start_navigation} />
        <h2>${picker.text}</h2>
        <div id="new" class=${!!window.plutoDesktop ? "desktop_opener" : ""}>
            <${FilePicker}
                key=${picker.placeholder}
                client=${client}
                value=""
                on_submit=${on_open_path}
                on_desktop_submit=${desktop_on_open_path}
                clear_on_blur=${false}
                button_label=${window.plutoDesktop ? "Open File" : "Open"}
                placeholder=${picker.placeholder}
            />
            ${window.plutoDesktop != null
                ? html`<${FilePicker}
                      key=${picker.placeholder}
                      client=${client}
                      value=""
                      on_desktop_submit=${desktop_on_open_url}
                      button_label="Open from URL"
                      placeholder=${picker.placeholder}
                  />`
                : null}
        </div>`
}

export const link_open_path = (path, execution_allowed = false) => "open?" + new URLSearchParams({ path: path }).toString()
export const link_open_url = (url) => "open?" + new URLSearchParams({ url: url }).toString()
export const link_edit = (notebook_id) => "edit?id=" + notebook_id
