import { RunLocalButton } from "../EditOrRunButton.js"
import { BinderButton } from "../EditOrRunButton.js"
import { html } from "../../imports/Preact.js"
import { start_local } from "../../common/RunLocal.js"
import { start_binder } from "../../common/Binder.js"

const local_provider = window.pluto_injected_environment.provides_backend

export const EditorLaunchBackendButton = ({ editor, launch_params, status }) => {
    console.log(status.offer_local && local_provider)
    if (status.offer_local && local_provider) return html`<div>CUSTOM BUTTON YEY</div>`
    if (status.offer_local)
        return html`<${RunLocalButton}
            start_local=${() =>
                start_local({
                    setStatePromise: editor.setStatePromise,
                    connect: editor.connect,
                    launch_params: launch_params,
                })}
        />`

    if (status.offer_binder)
        return html`<${BinderButton}
            offer_binder=${status.offer_binder}
            start_binder=${() =>
                start_binder({
                    setStatePromise: editor.setStatePromise,
                    connect: editor.connect,
                    launch_params: launch_params,
                })}
            notebookfile=${launch_params.notebookfile == null ? null : new URL(launch_params.notebookfile, window.location.href).href}
        />`

    return null
}
