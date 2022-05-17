import { html, Component, useRef } from "../imports/Preact.js"

/**
 * @param {{
 *  notebook: import("./Editor.js").NotebookData,
 *  disable_input: boolean,
 * }} props
 * */
export const NotebookHeader = ({ notebook, disable_input }) => {
    const title_ref = useRef(/** @type {HTMLHeadingElement} */ (null))

    return html`<pluto-notebook-header>
        <h1 ref=${title_ref} data-placeholder="Enter title..." contenteditable=${!disable_input}></h1>
    </pluto-notebook-header>`
}
