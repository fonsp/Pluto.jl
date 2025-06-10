import { html, useContext, useRef, useState, useEffect } from "../imports/Preact.js"
import { PlutoActionsContext } from "../common/PlutoContext.js"
import { cl } from "../common/ClassTable.js"
import { open_pluto_popup } from "../common/open_pluto_popup.js"
import { start_ai_suggestion } from "./CellInput/ai_suggestion.js"

const ai_server_url = "https://pluto-simple-llm-features.deno.dev/"
const endpoint_url = `${ai_server_url}fix-syntax-error-v1`

const pluto_premium_llm_key = localStorage.getItem("pluto_premium_llm_key")

// Server availability state management
let serverAvailabilityPromise = null

const checkServerAvailability = async () => {
    if (serverAvailabilityPromise === null) {
        serverAvailabilityPromise = Promise.all([
            // Check our AI endpoint
            fetch(endpoint_url, {
                method: "GET",
            })
                .then((response) => response.ok)
                .catch(() => {
                    console.warn("AI features disabled: Unable to access Pluto AI server. This may be due to network restrictions.")
                    return false
                }),
            // Check if ChatGPT domain is accessible. If not, then the uni has blocked the domain (probably) and we want to disable AI features.
            fetch("https://chat.openai.com/favicon.ico", {
                method: "HEAD",
                mode: "no-cors",
            })
                .then(() => true)
                .catch(() => {
                    console.warn("AI features disabled: Unable to access ChatGPT domain. This may be due to network restrictions.")
                    return false
                }),
        ]).then(([endpointAvailable, chatGPTAvailable]) => endpointAvailable && chatGPTAvailable)
    }
    return serverAvailabilityPromise
}

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
            <p>Pluto will send code from this cell to a commericial LLM service to fix syntax errors. Updated code will not run without confirmation.</p>
            <p>Submitted code can be used (anonymously) by Pluto developers to improve the AI service.</p>
            <label class="ask-next-time">
                <input type="checkbox" checked=${dontAskAgain} onChange=${(e) => setDontAskAgain(e.target.checked)} />
                Don't ask again
            </label>
            <div class="button-group" role="group">
                <button onClick=${handleDecline} class="decline" title="Decline AI syntax fix and close">No</button>
                <button onClick=${handleAccept} class="accept" title="Accept AI syntax fix and close">Yes</button>
            </div>
        </div>
    `
}

export const FixWithAIButton = ({ cell_id, diagnostics, last_run_timestamp }) => {
    const pluto_actions = useContext(PlutoActionsContext)
    if (pluto_actions.get_session_options?.()?.server?.enable_ai_editor_features === false) return null

    const node_ref = useRef(/** @type {HTMLElement?} */ (null))
    const [buttonState, setButtonState] = useState("initial") // "initial" | "loading" | "success"
    const [showButton, setShowButton] = useState(false)

    // Reset whenever a prop changes
    useEffect(() => {
        setButtonState("initial")
    }, [cell_id, diagnostics, last_run_timestamp])

    // Check server availability when component mounts
    useEffect(() => {
        checkServerAvailability().then((available) => {
            setShowButton(available)
        })
    }, [])

    // Don't render anything if server is not available
    if (!showButton) {
        return null
    }

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

    const original_code_ref = useRef("")

    const performFix = async () => {
        try {
            setButtonState("loading")

            // Get the current cell's code
            const notebook = pluto_actions.get_notebook()
            const code = notebook?.cell_inputs[cell_id]?.code
            original_code_ref.current = code

            if (!code) {
                throw new Error("Could not find cell code")
            }

            // Combine all diagnostic messages into a single error message
            const error_message = diagnostics.map((d) => d.message).join("\n")

            const response = await fetch(endpoint_url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(pluto_premium_llm_key ? { "X-Pluto-Premium-LLM-Key": pluto_premium_llm_key } : {}),
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
            if (fixed_code.trim() == "missing") throw new Error("Failed to fix syntax error")
            await start_ai_suggestion(node_ref.current, { code: fixed_code })
            setButtonState("success")
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

    const handleRejectAI = async () => {
        await start_ai_suggestion(node_ref.current, { code: original_code_ref.current, reject: true })
        setButtonState("initial")
    }

    const handleRunCell = async () => {
        await pluto_actions.set_and_run_multiple([cell_id])
    }

    return html`<div
        class=${cl({
            "fix-with-ai": true,
            [`fix-with-ai-${buttonState}`]: true,
        })}
    >
        <button
            ref=${node_ref}
            onClick=${buttonState === "success" ? handleRunCell : handleFixWithAI}
            title=${buttonState === "success" ? "Run the fixed cell" : "Attempt to fix this syntax error using an LLM service"}
            aria-busy=${buttonState === "loading"}
            aria-live="polite"
            disabled=${buttonState === "loading"}
        >
            ${buttonState === "success" ? "Accept & Run" : buttonState === "loading" ? "Loading..." : "Fix syntax with AI"}
        </button>
        ${buttonState === "success"
            ? html`<button onClick=${handleRejectAI} class="reject-ai-fix" title="Reject the AI fix and revert to original code">Reject</button>`
            : null}
    </div>`
}
