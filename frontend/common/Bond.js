// import Generators_input from "https://unpkg.com/@observablehq/stdlib@3.3.1/src/generators/input.js"
// import Generators_input from "https://unpkg.com/@observablehq/stdlib@3.3.1/src/generators/input.js"

import observablehq from "./SetupCellEnvironment.js"

export const connect_bonds = (node, all_completed_promise, cell_invalidated_promise, requests) => {
    node.querySelectorAll("bond").forEach(async (bond_node) => {
        // read the docs on Generators.input from observablehq/stdlib:
        const inputs = observablehq.Generators.input(bond_node.firstElementChild)
        var is_first_value = true

        // the <bond> node will be invalidated when the cell re-evaluates. when this happens, we need to stop processing input events
        var node_is_invalidated = false
        cell_invalidated_promise.then(() => {
            node_is_invalidated = true
        })

        while (!node_is_invalidated) {
            // wait for all (other) cells to complete - if we don't, the Julia code would get overloaded with new values
            await all_completed_promise.current
            // wait for a new input value. If a value is ready, then this promise resolves immediately
            const val = await inputs.next().value
            if (!node_is_invalidated) {
                // send to the Pluto back-end (have a look at set_bond in Editor.js)
                const to_send = await transformed_val(val)
                requests.set_bond(bond_node.getAttribute("def"), to_send, is_first_value)
            }
            // the first value might want to be ignored - https://github.com/fonsp/Pluto.jl/issues/275
            is_first_value = false
        }
    })
}

// The identity function in most cases, loads file contents when appropriate
const transformed_val = async (val) => {
    if (val instanceof FileList) {
        return await Array.from(val).map(transformed_val)
    } else if (val instanceof File) {
        return await new Promise((res) => {
            const reader = new FileReader()
            reader.onload = () => res({ name: val.name, type: val.type, data: new Uint8Array(reader.result) })
            reader.onerror = () => res({ name: val.name, type: val.type, data: null })
            reader.readAsArrayBuffer(val)
        })
    } else {
        return val
    }
}
