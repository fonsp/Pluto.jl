import { html, useContext, useRef } from "../imports/Preact.js"
import { PlutoActionsContext } from "../common/PlutoContext.js"

const ai_server_url = "https://pluto-simple-llm-features.deno.dev"

export const FixWithAIButton = ({ cell_id, diagnostics }) => {
    const pluto_actions = useContext(PlutoActionsContext)
    const node_ref = useRef(/** @type {HTMLElement?} */ (null))

    const handleFixWithAI = async () => {
        try {
            // Get the current cell's code
            const notebook = pluto_actions.get_notebook()
            const code = notebook?.cell_inputs[cell_id]?.code

            if (!code) {
                throw new Error("Could not find cell code")
            }

            // Combine all diagnostic messages into a single error message
            const error_message = diagnostics.map((d) => d.message).join("\n")

            const response = await fetch(`${ai_server_url}/fix-syntax-error`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    code,
                    error_message,
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Failed to fix syntax error")
            }

            const { fixed_code } = await response.json()

            console.debug("fixed_code", fixed_code)

            // Update the cell's local code without running it
            const cm = node_ref.current?.closest("pluto-cell")?.querySelector("pluto-input > .cm-editor")
            if (cm) {
                // @ts-ignore
                cm.CodeMirror.setValue(fixed_code)
            }
        } catch (error) {
            console.error("Error fixing syntax:", error)
            // TODO: Show error to user in UI
        }
    }

    return html`<button ref=${node_ref} class="fix-with-ai" onClick=${handleFixWithAI} title="Attempt to fix this syntax error using AI">Fix with AI</button> `
}
