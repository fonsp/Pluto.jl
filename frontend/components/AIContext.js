import _ from "../imports/lodash.js"
import { html, useState, useEffect, useMemo, useRef, useContext, useLayoutEffect, useErrorBoundary, useCallback } from "../imports/Preact.js"

import { CellOutput } from "./CellOutput.js"
import { CellInput } from "./CellInput.js"
import { Logs } from "./Logs.js"
import { RunArea, useDebouncedTruth } from "./RunArea.js"
import { cl } from "../common/ClassTable.js"
import { PlutoActionsContext } from "../common/PlutoContext.js"
import { SafePreviewOutput } from "./SafePreviewUI.js"
import { useEventListener } from "../common/useEventListener.js"
import { julia } from "../imports/CodemirrorPlutoSetup.js"

const format_code = (s) =>
    s == null
        ? ""
        : `<julia-code-block>
${s}
</julia-code-block>`

const format_cell_output = (/** @type {import("./Editor.js").CellResultData?} */ cell_result) => {
    const text = cell_output_to_plaintext(cell_result)

    return text == null
        ? ""
        : `<pluto-ai-context-cell-output errored="${cell_result?.errored ?? "false"}">
${text === "" || text == null ? "nothing" : text}
</pluto-ai-context-cell-output>`
}

const packages_context = (/** @type {import("./Editor.js").NotebookData} */ notebook) => {
    const has_nbpkg = notebook.nbpkg?.enabled === true
    const installed = Object.keys(notebook.nbpkg?.installed_versions ?? {})

    return !has_nbpkg
        ? ""
        : `
<pluto-ai-context-packages>
The following packages are currently installed in this notebook: ${installed.join(", ")}.
</pluto-ai-context-packages>`
}

export const AIContext = ({ cell_id, current_code }) => {
    const pluto_actions = useContext(PlutoActionsContext)
    const [copied, setCopied] = useState(false)
    const promptRef = useRef(null)

    const notebook = /** @type{import("./Editor.js").NotebookData} */ (pluto_actions.get_notebook())

    const current_cell = `
<pluto-ai-context-current-cell>
The current cell has the following code:

${format_code(current_code)}

${format_cell_output(notebook.cell_results[cell_id])}
</pluto-ai-context-current-cell>
`

    const upstream = notebook.cell_dependencies[cell_id]?.upstream_cells_map ?? {}
    const upstream_from_nb = Object.fromEntries(Object.entries(upstream).filter(([variable, upstream_cell_ids]) => upstream_cell_ids.length > 0))

    // Get the list of upstream cells, in the order that they appear in the notebook.
    const upstream_cells_raw = Object.values(upstream_from_nb).flatMap((x) => x)
    const upstream_cells = notebook.cell_order.filter((cid) => upstream_cells_raw.includes(cid))

    const variable_context = `
<pluto-ai-context-variables>
The current cell uses the following variables from other cells: ${Object.keys(upstream_from_nb).join(", ")}.

These variables are defined in the following cells:

${upstream_cells.map((cid) => format_code(notebook.cell_inputs[cid].code)).join("\n\n")}
</pluto-ai-context-variables>
`

    const prompt = `
<pluto-ai-context>
To help me answer my question, here is some auto-generated context. The code is from a Pluto Julia notebook. We are concerned with one specific cell in the notebook, called "the current cell". And you will get additional context.

${current_cell}

${upstream_cells.length > 0 ? variable_context : ""}

${packages_context(notebook)}
</pluto-ai-context>
`

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(prompt)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error("Failed to copy text:", err)
        }
    }

    return html`
        <div class="ai-context-container">
            <h2>AI Context</h2>
            <p class="ai-context-intro">You can copy this text into an AI chat to give more context about the cell.</p>
            <p class="ai-context-intro">Add your own question.</p>
            <div class="ai-context-prompt-container">
                <button
                    class=${cl({
                        "copy-button": true,
                        "copied": copied,
                    })}
                    onClick=${copyToClipboard}
                    title="Copy to clipboard"
                >
                    ${copied ? "Copied!" : "Copy"}
                </button>
                <div class="ai-context-prompt" ref=${promptRef}>
                    <pre>${prompt.trim()}</pre>
                </div>
            </div>
        </div>
    `
}

const cell_output_to_plaintext = (/** @type {import("./Editor.js").CellResultData?} */ cell_result) => {
    if (cell_result == null) return null

    const cell_output = cell_result.output
    if (cell_output.mime === "text/plain") {
        return cell_output.body
    }
    if (cell_output.mime === "application/vnd.pluto.stacktrace+object") {
        return cell_output.body.plain_error
    }
    if (cell_output.mime.includes("image")) return "<!-- Image -->"

    return JSON.stringify(cell_output)
}
