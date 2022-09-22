import _ from "../../imports/lodash.js"
import { html, useEffect, useState, useRef, useLayoutEffect } from "../../imports/Preact.js"
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

// We use a link from the head instead of directing linking "img/logo.svg" because parcel does not bundle preact files
const url_logo_big = document.head.querySelector("link[rel='pluto-logo-big']")?.getAttribute("href") ?? ""

export const Welcome = () => {
    const [remote_notebooks, set_remote_notebooks] = useState(/** @type {Array<NotebookListEntry>} */ ([]))

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
            client.send("completepath", { query: "" }, {})
        })
    }, [])

    const { show_samples, CustomRecent, CustomPicker } = extended_components

    const [navigating_away, set_navigation_away] = useState(/** @type {string?} */ (null))

    useLayoutEffect(() => {
        if (navigating_away != null) document.body.classList.add("loading")
    }, [navigating_away])

    return navigating_away != null
        ? html`<div class="navigating-away-banner"><h2>Loading ${navigating_away}...</h2></div>`
        : html`
              <section id="title">
                  <h1>welcome to <img src=${url_logo_big} /></h1>
                  <!-- <a id="github" href="https://github.com/fonsp/Pluto.jl"
                ><img src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/logo-github.svg"
            /></a> -->
              </section>
              <section id="mywork">
                  <div>
                      <${Recent}
                          client=${client_ref.current}
                          connected=${connected}
                          remote_notebooks=${remote_notebooks}
                          CustomRecent=${CustomRecent}
                          on_start_navigation=${set_navigation_away}
                      />
                  </div>
              </section>
              <section id="open">
                  <div>
                      <${Open}
                          client=${client_ref.current}
                          connected=${connected}
                          CustomPicker=${CustomPicker}
                          show_samples=${show_samples}
                          on_start_navigation=${set_navigation_away}
                      />
                  </div>
              </section>
              <section id="featured">
                  <div>
                      <${Featured} />
                  </div>
              </section>
          `
}
