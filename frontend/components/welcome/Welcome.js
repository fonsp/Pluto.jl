import _ from "../../imports/lodash.js"
import { html, useEffect, useState, useRef } from "../../imports/Preact.js"
import * as preact from "../../imports/Preact.js"

import { create_pluto_connection } from "../../common/PlutoConnection.js"
import { new_update_message } from "../../common/NewUpdateMessage.js"
import { Open } from "./Open.js"
import { Recent } from "./Recent.js"
import { Featured } from "./Featured.js"

// This is imported asynchronously - uncomment for development
// import environment from "../../common/Environment.js"

/**
 * @typedef NotebookListEntry
 * @type {{
 *  notebook_id: String,
 *  path: String,
 *  in_temp_dir: Boolean,
 *  shortpath: String,
 * }}
 */

export const Welcome = () => {
    const [remote_notebooks, set_remote_notebooks] = useState(/** @type {Array<NotebookListEntry>} */ (null))

    const [connected, set_connected] = useState(false)
    const [extended_components, set_extended_components] = useState({
        show_samples: true,
        CustomPicker: null,
        CustomRecent: null,
    })

    const client_ref = useRef(/** @type {import('../../common/PlutoConnection').PlutoConnection} */ ({}))

    useEffect(() => {
        const on_update = ({ message, type }) => {
            if (type === "notebook_list") {
                // a notebook list updates happened while the welcome screen is open, because a notebook started running for example
                set_remote_notebooks(message.notebooks)
            }
        }

        const on_connection_status = set_connected

        const client_promise = create_pluto_connection({
            on_unrequested_update: on_update,
            on_connection_status: on_connection_status,
            on_reconnect: () => true,
        })
        client_promise.then(async (client) => {
            Object.assign(client_ref.current, client)
            set_connected(true)

            try {
                const { default: environment } = await import(client.session_options.server.injected_javascript_data_url)
                const { custom_recent, custom_filepicker, show_samples = true } = environment({ client, editor: this, imports: { preact } })
                set_extended_components((old) => ({
                    ...old,
                    CustomRecent: custom_recent,
                    CustomPicker: custom_filepicker,
                    show_samples,
                }))
            } catch (e) {}

            new_update_message(client)

            // to start JIT'ting
            client.send("completepath", { query: "zzz" }, {})
        })
    }, [])

    const { show_samples, CustomRecent, CustomPicker } = extended_components

    return html`
        <section id="mywork">
            <div>
                <${Recent} client=${client_ref.current} connected=${connected} remote_notebooks=${remote_notebooks} CustomRecent=${CustomRecent} />
            </div>
        </section>
        <section id="open">
            <div>
                <${Open} client=${client_ref.current} connected=${connected} CustomPicker=${CustomPicker} show_samples=${show_samples} />
            </div>
        </section>
        <section id="featured">
            <div>
                <${Featured} />
            </div>
        </section>
    `
}
