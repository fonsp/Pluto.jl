import { html, useEffect, useRef, useState } from "../imports/Preact.js"
/**
 * Sometimes, we want to render HTML outside of the Cell Output,
 *   for to add toolboxes like the Table of Contents or something similar.
 * 
 * Additionally, the environment may want to inject some non cell/non editor
 * specific HTML to be rendered in the page. This component acts as a sink for
 * rendering these usecases.
 * 
 * That way, the Cell Output can change with a different lifecycle than
 * the Non-Cell output and environments can inject UI.
 * 
 * This component listens to events like the one below and updates
 * document.dispatchEvent(
 *      new CustomEvent("experimental_add_node_non_cell_output", {
 *          detail: { order: 1, node: html`<div>...</div>`, name: "Name of toolbox" }
 *      }))

 */
export const NonCellOutput = ({ environment_component, notebook_id }) => {
    const surely_the_latest_updated_set = useRef()
    const [component_set, update_component_set] = useState({})
    useEffect(() => {
        const hn = (e) => {
            try {
                const { name, node, order } = e.detail
                surely_the_latest_updated_set.current = { ...surely_the_latest_updated_set.current, [name]: { node, order } }
                update_component_set(surely_the_latest_updated_set.current)
            } catch (e) {}
        }
        document.addEventListener("experimental_add_node_non_cell_output", hn)
        return () => document.removeEventListener("experimental_add_node_non_cell_output", hn)
    }, [surely_the_latest_updated_set])

    let components = Object.values(component_set)
    components.sort(({ order: o1 }, { order: o2 }) => o1 - o2)
    components = components.map(({ node }) => node)
    return html`<div class="non-cell-output">
        ${environment_component ? html`<${environment_component} notebook_id=${notebook_id} />` : null} ${components}
    </div>`
}
