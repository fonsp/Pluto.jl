// If we are running inside a VS Code WebView, then this exposes the API.

// @ts-ignore
export const available = window.acquireVsCodeApi != null
// @ts-ignore
const vscode = window.acquireVsCodeApi?.() ?? {}
const store_cell_input_in_vscode_state = (cell_id, new_val) => {
    if (available) {
        const currentVSCodeState = vscode.getState() ?? {}
        const { cell_inputs_local, ...rest } = currentVSCodeState ?? {}
        api.setState({ cell_inputs_local: { ...(cell_inputs_local || {}), [cell_id]: { code: new_val } }, ...(rest ?? {}) })
    }
}

const load_cell_inputs_from_vscode_state = () => {
    if (available) {
        const state = vscode.getState() ?? {}
        return state.cell_inputs_local ?? {}
    }
    return {}
}

export const api = {
    postMessage: console.error,
    ...vscode,
    store_cell_input_in_vscode_state,
    load_cell_inputs_from_vscode_state,
}