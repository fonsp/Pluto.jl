import { html, useState, useRef, useLayoutEffect, useEffect, useMemo, useContext } from "../imports/Preact.js"
import immer from "../imports/immer.js"
import observablehq from "../common/SetupCellEnvironment.js"

import { RawHTMLContainer, highlight } from "./CellOutput.js"
import { PlutoActionsContext } from "../common/PlutoContext.js"
import { cl } from "../common/ClassTable.js"
import { open_pluto_popup } from "../common/open_pluto_popup.js"


/**
 * @param {{
 *   notebook : import("./Editor.js").NotebookData,
 *   client_id: string
 * }} props
 **/
export const CollabTab = ({ client_id, notebook }) => {
    const pluto_actions = useContext(PlutoActionsContext)

    const update_name = (/** @type {string} */name) => pluto_actions.update_notebook(nb => nb.users[client_id].name = name)

    return html`
    <ul>
        ${Object.entries(notebook.users).map(([clientID, { name }]) => html`<li key=${clientID}>${name}${clientID === client_id ? " (you)" : undefined}</li>`)}
    </ul>

    <button onClick=${() => open_pluto_popup({ should_focus: true, type: "info", big: true, body: html`<${ChangeNamePopup} update_name=${update_name} name=${notebook.users[client_id].name} />` })}>Edit name</button>
    `
}

/**
 * @param {{
 *   name: string,
 *   update_name: (name: string) => undefined,
 * }} props
 **/
const ChangeNamePopup = ({ name, update_name }) => {
    const [inputName, setName] = useState(name)

    return html`hello? <form onSubmit=${(event) => {
        event.preventDefault();
        update_name(inputName)
        window.dispatchEvent(new CustomEvent("close pluto popup"))
    }}><input onChange=${event => setName(event.target.value)} value=${name}></input><input type="submit">Change Name</input></form>`
}
