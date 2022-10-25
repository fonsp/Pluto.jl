import _ from "../../imports/lodash.js"
import { html, useEffect, useState, useRef, useLayoutEffect } from "../../imports/Preact.js"
import * as preact from "../../imports/Preact.js"

import { create_pluto_connection } from "../../common/PlutoConnection.js"
import { new_update_message } from "../../common/NewUpdateMessage.js"
import { Open } from "./Open.js"
import { Recent } from "./Recent.js"
import { Featured } from "./Featured.js"
import { get_environment } from "../../common/Environment.js"

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
                const environment = await get_environment(client)
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

    // When block_screen_with_this_text is null (default), all is fine. When it is a string, we show a big banner with that text, and disable all other UI. https://github.com/fonsp/Pluto.jl/pull/2292
    const [block_screen_with_this_text, set_block_screen_with_this_text] = useState(/** @type {string?} */ (null))

    const on_start_navigation = (value, expect_navigation = true) => {
        if (expect_navigation) {
            // Instead of calling set_block_screen_with_this_text(value) directly, we wait for the beforeunload to happen, and then we do it. If this event does not happen within 1 second, then that means that the user right-clicked, or Ctrl+Clicked (to open in a new tab), and we don't want to clear the main menu. https://github.com/fonsp/Pluto.jl/issues/2301
            const handler = (e) => {
                set_block_screen_with_this_text(value)
            }
            window.addEventListener("beforeunload", handler)
            setTimeout(() => window.removeEventListener("beforeunload", handler), 1000)
        } else {
            set_block_screen_with_this_text(value)
        }
    }

    return block_screen_with_this_text != null
        ? html`<div class="navigating-away-banner"><h2>Loading ${block_screen_with_this_text}...</h2></div>`
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
                          on_start_navigation=${on_start_navigation}
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
                          on_start_navigation=${on_start_navigation}
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
