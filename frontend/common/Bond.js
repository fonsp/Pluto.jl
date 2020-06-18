// import Generators_input from "https://unpkg.com/@observablehq/stdlib@3.3.1/src/generators/input.js"
// import Generators_input from "https://unpkg.com/@observablehq/stdlib@3.3.1/src/generators/input.js"

import observablehq from "./SetupCellEnvironment.js"

export const connect_bonds = (node, all_completed_promise, requests) => {
    node.querySelectorAll("bond").forEach(async (bond_node) => {
        // read the docs on Generators.input from observablehq/stdlib:
        const inputs = observablehq.Generators.input(bond_node.firstElementChild)
        
        while (bond_node.getRootNode() == document) {
            // wait for all (other) cells to complete - if we don't, the Julia code would get overloaded with new values
            await all_completed_promise.current
            // wait for a new input value. If a value is ready, then this promise resolves immediately
            const val = await inputs.next().value
            // send to the Pluto back-end (have a look at set_bond in Editor.js)
            requests.set_bond(bond_node.getAttribute("def"), val)
        }
    })
}
