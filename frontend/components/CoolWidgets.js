import _ from "../imports/lodash.js"
import { html as phtml } from "../imports/Preact.js"

import observablehq_for_myself from "../common/SetupCellEnvironment.js"
// widgets inside codemirror need to be DOM elements, not Preact VDOM components. So in this code, we will use html from observablehq, which is just like html from Preact, except it creates DOM nodes directly, not Preact VDOM elements.
const html = observablehq_for_myself.html

export const dog = ({ code, set_code }) => {
    console.log(code)

    const node = document.createElement("img")
    node.style.height = "1em"
    node.style.display = "inline-block"
    node.src = `https://user-images.githubusercontent.com/6933510/116753174-fa40ab80-aa06-11eb-94d7-88f4171970b2.jpeg`

    return node
}

export const slider = ({ code, set_code }) => {
    console.log(code)

    Number(code.match(/\d+/)[0])

    const node = document.createElement("input")
    node.type = "range"
    node.style.width = "60px"
    node.style.height = "1em"

    node.valueAsNumber = Number(code.match(/\d+/)[0])

    console.log(node)

    node.addEventListener("input", () => {
        set_code(`slider(${node.valueAsNumber})`, {
            submit: true,
        })
    })

    return node
}
