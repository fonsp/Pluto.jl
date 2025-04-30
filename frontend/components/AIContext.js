import _ from "../imports/lodash.js"
import { html, useState, useEffect, useMemo, useRef, useContext, useLayoutEffect, useErrorBoundary, useCallback } from "../imports/Preact.js"

import { CellOutput } from "./CellOutput.js"
import { CellInput } from "./CellInput.js"
import { Logs } from "./Logs.js"
import { RunArea, useDebouncedTruth } from "./RunArea.js"
import { cl } from "../common/ClassTable.js"
import { PlutoActionsContext } from "../common/PlutoContext.js"
import { open_pluto_popup } from "../common/open_pluto_popup.js"
import { SafePreviewOutput } from "./SafePreviewUI.js"
import { useEventListener } from "../common/useEventListener.js"
import { julia } from "../imports/CodemirrorPlutoSetup.js"

const format_code = (s) =>
    s == null
        ? ""
        : `<julia-code-block>
${s}
</julia-code-block>`

export const AIContext = ({ cell_id, current_code }) => {
    const pluto_actions = useContext(PlutoActionsContext)

    const notebook = /** @type{import("./Editor.js").NotebookData} */ (pluto_actions.get_notebook())

    const current_cell = `
<pluto-ai-context-current-cell>
The current cell has the following code:

${format_code(current_code)}
</pluto-ai-context-current-cell>
`

    const upstream = notebook.cell_dependencies[cell_id]?.upstream_cells_map ?? {}
    const upstream_from_nb = Object.fromEntries(Object.entries(upstream).filter(([variable, upstream_cell_ids]) => upstream_cell_ids.length > 0))

    // Get the list of upstream cells, in the order that they appear in the notebook.
    const upstream_cells_raw = Object.values(upstream_from_nb).flatMap((x) => x)
    const upstream_cells = notebook.cell_order.filter((cid) => upstream_cells_raw.includes(cid))

    console.log(upstream_cells)

    const variable_context = `
<pluto-ai-context-variables>
The current cell uses the following variables: ${Object.keys(upstream_from_nb)
        .map((s) => `\\${s}\\`)
        .join(", ")}.

These variables are defined in the following cells:

${upstream_cells.map((cid) => format_code(notebook.cell_inputs[cid].code)).join("\n\n")}
</pluto-ai-context-variables>
`

    const prompt = `
<pluto-ai-context>
The code is from a Pluto Julia notebook. We are concerned with one specific cell in the noteboo, called "the current cell". I will give you the current cell, and variable context.

${current_cell}

${upstream_cells.length > 0 ? variable_context : ""}
</pluto-ai-context>
`

    console.log(prompt)

    return html`
        <div>
            <h1>AI Context</h1>
        </div>
    `
}
