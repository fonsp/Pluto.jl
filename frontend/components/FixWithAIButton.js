import { html, useContext, useRef, useState } from "../imports/Preact.js"
import { PlutoActionsContext } from "../common/PlutoContext.js"
import { cl } from "../common/ClassTable.js"

const ai_server_url = "https://pluto-simple-llm-features.deno.dev"

export const FixWithAIButton = ({ cell_id, diagnostics }) => {
    const pluto_actions = useContext(PlutoActionsContext)
    const node_ref = useRef(/** @type {HTMLElement?} */ (null))
    const [buttonState, setButtonState] = useState("initial") // "initial" | "loading" | "success"

    const handleFixWithAI = async () => {
        try {
            setButtonState("loading")

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
                setButtonState("success")
            }
        } catch (error) {
            console.error("Error fixing syntax:", error)
            setButtonState("initial")
            // TODO: Show error to user in UI
        }
    }

    const handleRunCell = async () => {
        await pluto_actions.set_and_run_multiple([cell_id])
    }

    return html`<button
        ref=${node_ref}
        class=${cl({
            "fix-with-ai": true,
            [`fix-with-ai-${buttonState}`]: true,
        })}
        onClick=${buttonState === "success" ? handleRunCell : handleFixWithAI}
        title=${buttonState === "success" ? "Run the fixed cell" : "Attempt to fix this syntax error using AI"}
    >
        ${buttonState === "success" ? "Run cell" : buttonState === "loading" ? "Loading..." : "Fix with AI"}
    </button>`
}
