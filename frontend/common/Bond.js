// import Generators_input from "https://unpkg.com/@observablehq/stdlib@3.3.1/src/generators/input.js"
// import Generators_input from "https://unpkg.com/@observablehq/stdlib@3.3.1/src/generators/input.js"

import observablehq from "./SetupCellEnvironment.js"

/**
 * Copied from the observable stdlib source, but we need it to be faster than Generator.input because Generator.input is async by nature, so will lag behind that one tick that is breaking the code.
 * https://github.com/observablehq/stdlib/blob/170f137ac266b397446320e959c36dd21888357b/src/generators/input.js#L13
 * @param {Element} input
 * @returns {any}
 */
function get_input_value(input) {
    if (input instanceof HTMLInputElement) {
        switch (input.type) {
            case "range":
            case "number":
                return input.valueAsNumber
            case "date":
                return input.valueAsDate
            case "checkbox":
                return input.checked
            case "file":
                return input.multiple ? input.files : input.files[0]
            case "select-multiple":
                //@ts-ignore
                return Array.from(input.selectedOptions, (o) => o.value)
            default:
                return input.value
        }
    } else {
        //@ts-ignore
        return input.value
    }
}

/**
 * @param {Element} input
 * @param {any} new_value
 */
const set_input_value = (input, new_value) => {
    if (new_value == null) {
        //@ts-ignore
        input.value = new_value
        return
    }
    if (input instanceof HTMLInputElement) {
        switch (input.type) {
            case "range":
            case "number": {
                if (input.valueAsNumber !== new_value) {
                    input.valueAsNumber = new_value
                }
                return
            }
            case "date": {
                if (input.valueAsDate == null || Number(input.valueAsDate) !== Number(new_value)) {
                    input.valueAsDate = new_value
                }
                return
            }
            case "checkbox": {
                if (input.checked !== new_value) {
                    input.checked = new_value
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
                    option.selected = new_value.includes(option.value)
                }
                return
            }
        }
    }
    //@ts-ignore
    if (input.value !== new_value) {
        //@ts-ignore
        input.value = new_value
    }
}

export const set_bound_elements_to_their_value = (node, bond_values) => {
    for (let bond_node of node.querySelectorAll("bond")) {
        let bond_name = bond_node.getAttribute("def")
        if (bond_node.firstElementChild != null && bond_values[bond_name] != null) {
            let val = bond_values[bond_name].value
            try {
                set_input_value(bond_node.firstElementChild, val)
            } catch (error) {
                console.error(`Error while setting input value`, bond_node.firstElementChild, `to value`, val, `: `, error)
            }
        }
    }
}

/**
 * @param {Element} node
 * @param {(name: string, value: any, is_first_value: boolean) => Promise} on_bond_change
 */
export const add_bonds_listener = (node, on_bond_change) => {
    // the <bond> node will be invalidated when the cell re-evaluates. when this happens, we need to stop processing input events
    let node_is_invalidated = false

    node.querySelectorAll("bond").forEach(async (bond_node) => {
        const initial_value = get_input_value(bond_node.firstElementChild)
        // Initialize the bond. This will send the data to the backend for the first time. If it's already there, and the value is the same, cells won't rerun.
        const init_promise = on_bond_change(bond_node.getAttribute("def"), initial_value, true)

        // see the docs on Generators.input from observablehq/stdlib
        let skippped_first = false
        for (let val of observablehq.Generators.input(bond_node.firstElementChild)) {
            if (node_is_invalidated) break

            if (skippped_first === false) {
                skippped_first = true
                continue
            }
            // wait for a new input value. If a value is ready, then this promise resolves immediately
            const to_send = await transformed_val(await val)

            // send to the Pluto back-end (have a look at set_bond in Editor.js)
            // await the setter to avoid collisions
            //TODO : get this from state
            await init_promise
            await on_bond_change(bond_node.getAttribute("def"), to_send, false).catch(console.error)
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
