import _ from "../../imports/lodash.js"
import { html, Component, useEffect, useState, useMemo } from "../../imports/Preact.js"

import { FilePicker } from "../FilePicker.js"
import { PasteHandler } from "../PasteHandler.js"
import { guess_notebook_location } from "../../common/NotebookLocationFromURL.js"

/**
 * @param {{
 *  client: import("../../common/PlutoConnection.js").PlutoConnection?,
 *  connected: Boolean,
 *  show_samples: Boolean,
 *  CustomPicker: {text: String, placeholder: String}?,
 * }} props
 */
export const Open = ({ client, connected, CustomPicker, show_samples }) => {
    const on_open_path = async (new_path) => {
        const processed = await guess_notebook_location(new_path)
        if (processed.type === "path") {
            document.body.classList.add("loading")
            window.location.href = link_open_path(processed.path_or_url)
        } else {
            if (confirm("Are you sure? This will download and run the file at\n\n" + processed.path_or_url)) {
                document.body.classList.add("loading")
                window.location.href = link_open_url(processed.path_or_url)
            }
        }
    }

    const picker = CustomPicker ?? {
        text: "Open from file",
        placeholder: "Enter path or URL...",
    }

    return html`<${PasteHandler} />
        <div id="new">
            ${picker.text}:
            <${FilePicker}
                key=${picker.placeholder}
                client=${client}
                value=""
                on_submit=${on_open_path}
                button_label="Open"
                placeholder=${picker.placeholder}
            />
        </div>`
}

// /open will execute a script from your hard drive, so we include a token in the URL to prevent a mean person from getting a bad file on your computer _using another hypothetical intrusion_, and executing it using Pluto
export const link_open_path = (path) => "open?" + new URLSearchParams({ path: path }).toString()
export const link_open_url = (url) => "open?" + new URLSearchParams({ url: url }).toString()
export const link_edit = (notebook_id) => "edit?id=" + notebook_id
