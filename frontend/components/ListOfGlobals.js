import _ from "../imports/lodash.js"
import { html, useState, useEffect, useMemo, useRef, useContext, useLayoutEffect, useErrorBoundary, useCallback } from "../imports/Preact.js"

/**
 * @param {{
 *  notebook: import("./Editor.js").NotebookData,
 * }} props
 * */
export const ListOfGlobals = ({ notebook }) => {
    const globals = Object.values(notebook.cell_dependencies)
        .flatMap((x) => Object.keys(x.downstream_cells_map))
        .filter((s) => !s.startsWith("#"))

    return html`
        <div class="list-of-globals">
            <h3>Globals</h3>
            <ul>
                ${globals.map((global) => html`<li>${global}</li>`)}
            </ul>
        </div>
    `
}
