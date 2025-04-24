import { html, useContext, useRef, useState } from "../imports/Preact.js"
import { PlutoActionsContext } from "../common/PlutoContext.js"
import { cl } from "../common/ClassTable.js"
import { open_pluto_popup } from "../common/open_pluto_popup.js"

const ai_server_url = "https://pluto-simple-llm-features.deno.dev"

const AIPermissionPrompt = ({ onAccept, onDecline }) => {
    const [dontAskAgain, setDontAskAgain] = useState(false)

    const handleAccept = () => {
        if (dontAskAgain) {
            localStorage.setItem("pluto_ai_permission_syntax_v1", "granted")
        }
        onAccept()
    }

    const handleDecline = () => {
        onDecline()
    }

    return html`
        <div class="ai-permission-prompt">
            <h3>Use AI to fix syntax errors?</h3>
            <p>Pluto will send code from this cell to a commericial LLM service to help fix syntax errors. Updated code will not run without confirmation.</p>
            <p>Submitted code can be used (anonymously) by Pluto developers to improve the AI service.</p>
            <label class="ask-next-time">
                <input type="checkbox" checked=${dontAskAgain} onChange=${(e) => setDontAskAgain(e.target.checked)} />
                Don't ask again
            </label>
            <div class="button-group">
                <button onClick=${handleDecline} class="decline">No</button>
                <button onClick=${handleAccept} class="accept">Yes</button>
            </div>
        </div>
    `
}

export const FixWithAIButton = ({ cell_id, diagnostics }) => {
    const pluto_actions = useContext(PlutoActionsContext)
    const node_ref = useRef(/** @type {HTMLElement?} */ (null))
    const [buttonState, setButtonState] = useState("initial") // "initial" | "loading" | "success"

    const handleFixWithAI = async () => {
        // Check if we have permission stored
        const storedPermission = localStorage.getItem("pluto_ai_permission_syntax_v1")

        if (storedPermission !== "granted") {
            // Show permission prompt
            open_pluto_popup({
                type: "info",
                source_element: node_ref.current,
                body: html`<${AIPermissionPrompt}
                    onAccept=${async () => {
                        window.dispatchEvent(new CustomEvent("close pluto popup"))
                        await performFix()
                    }}
                    onDecline=${() => {
                        window.dispatchEvent(new CustomEvent("close pluto popup"))
                    }}
                />`,
            })
            return
        }

        await performFix()
    }

    const performFix = async () => {
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
            // Show error to user in UI
            open_pluto_popup({
                type: "warn",
                source_element: node_ref.current,
                body: html`<p>Failed to fix syntax error: ${error.message}</p>`,
            })
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
