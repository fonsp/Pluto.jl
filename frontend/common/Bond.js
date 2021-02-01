// import Generators_input from "https://unpkg.com/@observablehq/stdlib@3.3.1/src/generators/input.js"
// import Generators_input from "https://unpkg.com/@observablehq/stdlib@3.3.1/src/generators/input.js"

import observablehq from "./SetupCellEnvironment.js"

/**
 * @param {HTMLInputElement} input
 * @param {any} value
 */
const set_input = (input, value) => {
    if (value == null) {
        input.value = null
        return
    }
    switch (input.type) {
        case "range":
        case "number": {
            if (input.valueAsNumber !== value) {
                input.valueAsNumber = value
            }
            return
        }
        case "date": {
            if (input.valueAsDate == null || Number(input.valueAsDate) !== Number(value)) {
                input.valueAsDate = value
            }
            return
        }
        case "checkbox": {
            if (input.checked !== value) {
                input.checked = value
            }
            return
        }
        case "file": {
            // Can't set files :(
            return
        }
        case "select-multiple": {
            // @ts-ignore
            for (let option of input.options) {
                option.selected = value.includes(option.value)
            }
            return
        }
        default: {
            if (input.value !== value) {
                input.value = value
            }
            return
        }
    }
}

export const set_bound_elements_to_their_value = (node, bond_values) => {
    for (let bond_node of node.querySelectorAll("bond")) {
        let bond_name = bond_node.getAttribute("def")
        if (bond_node.firstElementChild != null && bond_values[bond_name] != null) {
            try {
                set_input(bond_node.firstElementChild, bond_values[bond_name].value)
            } catch (error) {
                console.error(`error while setting input`, bond_node.firstElementChild, `to value`, bond_values[bond_name].value, `:`, error)
            }
        }
    }
}

/**
 * @param {HTMLElement} node
 * @param {(name: string, value_to_send: any, is_first_value: boolean) => void} on_bond_change
 */
export const add_bonds_listener = (node, on_bond_change) => {
    // the <bond> node will be invalidated when the cell re-evaluates. when this happens, we need to stop processing input events
    var node_is_invalidated = false

    node.querySelectorAll("bond").forEach(async (bond_node) => {
        // read the docs on Generators.input from observablehq/stdlib:
        const inputs = observablehq.Generators.input(bond_node.firstElementChild)
        var is_first_value = true

        while (!node_is_invalidated) {
            // wait for a new input value. If a value is ready, then this promise resolves immediately
            const val = await inputs.next().value
            if (!node_is_invalidated) {
                // send to the Pluto back-end (have a look at set_bond in Editor.js)
                const to_send = await transformed_val(val)
                on_bond_change(bond_node.getAttribute("def"), to_send, is_first_value)
            }
            // the first value might want to be ignored - https://github.com/fonsp/Pluto.jl/issues/275
            is_first_value = false
        }
    })

    return function dispose_bond_listener() {
        node_is_invalidated = true
    }
}

/**
 * The identity function in most cases, loads file contents when appropriate
 * @type {((val: FileList) => Promise<Array<File>>)
 *  & ((val: File) => Promise<{ name: string, type: string, data: Uint8Array }>)
 *  & ((val: any) => Promise<any>)
 * }
 */
const transformed_val = async (val) => {
    if (val instanceof FileList) {
        return Promise.all(Array.from(val).map((file) => transformed_val(file)))
    } else if (val instanceof File) {
        return await new Promise((res) => {
            const reader = new FileReader()
            // @ts-ignore
            reader.onload = () => res({ name: val.name, type: val.type, data: new Uint8Array(reader.result) })
            reader.onerror = () => res({ name: val.name, type: val.type, data: null })
            reader.readAsArrayBuffer(val)
        })
    } else {
        return val
    }
}
