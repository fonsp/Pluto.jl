import { html, useMemo, useEffect } from "../../imports/Preact.js"
import * as preact from "../../imports/Preact.js"
import { RunLocalButton, BinderButton } from "../EditOrRunButton.js"
import { start_local } from "../../common/RunLocal.js"
import { BackendLaunchPhase, start_binder } from "../../common/Binder.js"
import immer, { applyPatches, produceWithPatches } from "../../imports/immer.js"

export const EditorLaunchBackendButton = ({ editor, launch_params, status }) => {
    try {
        const EnvRun = useMemo(
            // @ts-ignore
            () => window?.pluto_injected_environment?.environment?.({ client: editor.client, editor, imports: { immer, preact } })?.custom_run_or_edit,
            [editor.client, editor]
        )
        // @ts-ignore
        if (window?.pluto_injected_environment?.provides_backend) {
            // @ts-ignore
            return html`<${EnvRun} editor=${editor} backend_phases=${BackendLaunchPhase} launch_params=${launch_params} />`
            // Don't allow a misconfigured environment to stop offering other backends
        }
    } catch (e) {}
    if (status == null) return null
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
            notebook=${editor.state.notebook}
        />`

    return null
}
