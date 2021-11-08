// If we are running inside a VS Code WebView, then this exposes the API.

// @ts-ignore
export const available = window.acquireVsCodeApi != null
// @ts-ignore
const vscode = window.acquireVsCodeApi?.() ?? {}
const set_local_cell = (cell_id, new_val) => {
    if (available) {
        const currentVSCodeState = vscode.getState() ?? {}
        const { cell_inputs_local, ...rest } = currentVSCodeState ?? {}
        console.log('This is happening', currentVSCodeState)
        api.setState({ cell_inputs_local: { ...(cell_inputs_local || {}), [cell_id]: { code: new_val } }, ...(rest ?? {}) })
    }
}

const init_cell_inputs_local = () => {
    if (available) {
        const state = vscode.getState() ?? {}
        console.log('This is also happening', state)
        return state.cell_inputs_local ?? {}
    }
    return {}
}

export const api = {
    postMessage: console.error,
    ...vscode,
    set_local_cell,
    init_cell_inputs_local,
}
