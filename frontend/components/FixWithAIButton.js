import { html, useContext } from "../imports/Preact.js"
import { PlutoActionsContext } from "../common/PlutoContext.js"

export const FixWithAIButton = ({ cell_id, diagnostics }) => {
    const pluto_actions = useContext(PlutoActionsContext)

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

            const response = await fetch("http://localhost:8000/fix-syntax-error", {
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

            // Dispatch an event to update the cell's code
            window.dispatchEvent(
                new CustomEvent("set_cell_code", {
                    detail: {
                        cell_id,
                        code: fixed_code,
                    },
                })
            )
        } catch (error) {
            console.error("Error fixing syntax:", error)
            // TODO: Show error to user in UI
        }
    }

    return html` <button class="fix-with-ai" onClick=${handleFixWithAI} title="Attempt to fix this syntax error using AI">Fix with AI</button> `
}
