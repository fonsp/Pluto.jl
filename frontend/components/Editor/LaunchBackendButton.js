import { html } from "../../imports/Preact.js"
import * as preact from "../../imports/Preact.js"
import { RunLocalButton, BinderButton } from "../EditOrRunButton.js"
import { start_local } from "../../common/RunLocal.js"
import { start_binder } from "../../common/Binder.js"

export const EditorLaunchBackendButton = ({ editor, launch_params, status }) => {
    // @ts-ignore
    if (window?.pluto_injected_environment?.provides_backend) {
        try {
            // @ts-ignore
            const EnvRun = window.pluto_injected_environment.environment({ client: editor.client, editor, imports: { preact } }).custom_run_or_edit
            return html`<${EnvRun} />`
            // Don't allow a misconfigured environment to stop offering other backends
        } catch (e) {}
    }
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
