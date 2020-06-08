import Generators_input from "https://unpkg.com/@observablehq/stdlib@3.3.1/src/generators/input.js"

const make_bond = (bond_node, all_completed_promise, requests) => {
    if(bond_node.getRootNode() != document){
        return
    }
    all_completed_promise.current.then(() => {
        bond_node.generator.next().value.then(val => {
        // statistics.numBondSets++
        requests.set_bond(bond_node.getAttribute("def"), val)
            make_bond(bond_node, all_completed_promise, requests)
        })
    })
}

export const connect_bonds = (node, all_completed_promise, requests) => {
    node.querySelectorAll("bond").forEach(bond_node => {
        bond_node.generator = Generators_input(bond_node.firstElementChild)
        make_bond(bond_node, all_completed_promise, requests)
    })
}
