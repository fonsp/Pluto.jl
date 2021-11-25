import _ from "../imports/lodash.js"
import { html, useState, useEffect, useMemo, useRef, useContext, useLayoutEffect } from "../imports/Preact.js"

import { CellOutput } from "./CellOutput.js"
import { CellInputView } from "./CellInput.js"
import { RunArea, useDebouncedTruth } from "./RunArea.js"
import { cl } from "../common/ClassTable.js"
import { useDropHandler } from "./useDropHandler.js"
import { PlutoContext } from "../common/PlutoContext.js"

/**
 * @param {{
 *  notebook: import("./Editor.js").NotebookData,
 *  all_cell_dependencies: { [uuid: string]: import("./Editor.js").CellDependencyData },
 *  cell_id: string,
 *  downstream: boolean,
 * }} props
 * */
export const CellDependenciesGraph = ({ notebook, all_cell_dependencies, downstream = true }) => {
    // reverse the object
    const last_cell_id_ref = useRef(null)
    let focused_cell_id = document.activeElement.closest("pluto-cell")?.id

    let cell_id = focused_cell_id ?? last_cell_id_ref.current

    if (!cell_id) {
        return
    }
    last_cell_id_ref.current = cell_id

    let [hovering_cell_id, set_hovering_cell_id] = useState(null)

    let my_cell_dependencies = all_cell_dependencies[cell_id]
    if (my_cell_dependencies === undefined) {
        return
    }
    let variables = downstream ? my_cell_dependencies.downstream_cells_map : my_cell_dependencies.upstream_cells_map

    /** @type{Map<string,Set<string>>} */
    let variables_per_cell = new Map()
    Object.entries(variables).forEach(([symbol, cell_ids]) => {
        cell_ids.forEach((cell_id) => {
            let old = variables_per_cell.get(cell_id) ?? new Set()
            variables_per_cell.set(cell_id, old.add(symbol))
        })
    })

    let all_cell_ids = Object.values(variables).flatMap((x) => x)

    let cell_element = document.getElementById(cell_id)
    let cell_rect = cell_element.getBoundingClientRect()

    return html`<dependencies-graph
        class=${cl({
            active: focused_cell_id != null,
        })}
        onmouseleave=${() => set_hovering_cell_id(null)}
    >
        <pl-dependency-list>
            ${Array.from(variables_per_cell.entries()).map(([other_cell_id, symbols]) => {
                let code = notebook.cell_inputs[other_cell_id].code

                let name = Object.keys(all_cell_dependencies[other_cell_id]?.downstream_cells_map ?? {}).join(", ")

                return html`<pl-dependency
                    onclick=${() => {
                        let other_cell = document.getElementById(other_cell_id)
                        console.log(other_cell_id, other_cell)
                        other_cell.scrollIntoView({
                            block: "center",
                            behavior: "smooth",
                        })
                        other_cell.focus()
                    }}
                    onmouseenter=${() => set_hovering_cell_id(other_cell_id)}
                >
                    <div class="d-link">${[...symbols].join(", ")}</div>
                    <div class="d-dot"></div>
                    <div class="d-name">${name}</div>
                </pl-dependency>`
            })}
        </pl-dependency-list>
        <pl-dependency-preview>
            ${hovering_cell_id ? html`<${CellInputView} remote_code=${notebook.cell_inputs[hovering_cell_id].code} />` : null}
        </pl-dependency-preview>
    </dependencies-graph>`
}

const donothing = () => {}
