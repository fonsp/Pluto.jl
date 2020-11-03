import { html, Component, useRef, useLayoutEffect, useEffect } from "../imports/Preact.js"

import { cl } from "../common/ClassTable.js"

import { observablehq_for_cells } from "../common/SetupCellEnvironment.js"

import { PlutoImage, RawHTMLContainer, OutputBody } from "./CellOutput.js"

const SimpleOutputBody = ({ mime, body, cell_id, all_completed_promise, requests, persist_js_state }) => {
    switch (mime) {
        case "image/png":
        case "image/jpg":
        case "image/jpeg":
        case "image/gif":
        case "image/bmp":
        case "image/svg+xml":
            return html`<${PlutoImage} mime=${mime} body=${body} />`
            break
        case "text/html":
            return html`<${RawHTMLContainer}
                body=${body}
                all_completed_promise=${all_completed_promise}
                requests=${requests}
                persist_js_state=${persist_js_state}
            />`
            break
        case "application/vnd.pluto.tree+object":
            return html`<${TreeView} body=${body} all_completed_promise=${all_completed_promise} requests=${requests} persist_js_state=${persist_js_state} />`
            break
        case "text/plain":
        default:
            return html`<pre>${body}</pre>`
            break
    }
}

export const TreeView = ({ mime, body, cell_id, all_completed_promise, requests, persist_js_state }) => {
    const mimepair_output = (pair) => html`<${SimpleOutputBody}
        mime=${pair[1]}
        body=${pair[0]}
        all_completed_promise=${all_completed_promise}
        requests=${requests}
        persist_js_state=${persist_js_state}
    />`
    var inner = null
    switch (body.type) {
        case "Pair":
            const r = body.key_value
            return html`<jlpair class=${body.type}
                ><r><k>${mimepair_output(r[0])}</k><v>${mimepair_output(r[1])}</v></r></jlpair
            >`
        case "circular":
            return html`<em>circular reference</em>`
        case "Array":
        case "Tuple":
            inner = html`${body.prefix}<jlarray class=${body.type}
                    >${body.elements.map((r) =>
                        r === "more" ? html`<r><more></more></r>` : html`<r><k>${r[0]}</k><v>${mimepair_output(r[1])}</v></r>`
                    )}</jlarray
                >`
            break
            break
        case "Dict":
        case "NamedTuple":
            inner = html`<jldict class=${body.type}
                >${body.elements.map((r) =>
                    r === "more" ? html`<r><more></more></r>` : html`<r><k>${mimepair_output(r[0])}</k><v>${mimepair_output(r[1])}</v></r>`
                )}</jldict
            >`
            break
        case "struct":
            console.log(body)
            inner = html`${body.prefix}<jlstruct> ${body.elements.map((r) => html`<r><k>${r[0]}</k><v>${mimepair_output(r[1])}</v></r>`)} </jlstruct>`
            break
    }

    const node_ref = useRef(null)
    const onclick = (e) => {
        self = node_ref.current
        if (e.target !== self && !self.classList.contains("collapsed")) {
            return
        }
        var parent_tree = self.parentElement
        while (parent_tree.tagName != "PLUTO-OUTPUT") {
            parent_tree = parent_tree.parentElement
            if (parent_tree.tagName == "JLTREE" && parent_tree.classList.contains("collapsed")) {
                return // and bubble upwards
            }
        }

        self.classList.toggle("collapsed")
    }
    return html`<jltree class="collapsed" onclick=${onclick} ref=${node_ref}>${inner}</jltree>`
}

window.onjltreeclick = (self, e) => {
    if (e.target !== self && !self.classList.contains("collapsed")) {
        return
    }
    var parent_tree = self.parentElement
    while (parent_tree.tagName != "PLUTO-OUTPUT") {
        parent_tree = parent_tree.parentElement
        if (parent_tree.tagName == "JLTREE" && parent_tree.classList.contains("collapsed")) {
            return // and bubble upwards
        }
    }

    self.classList.toggle("collapsed")
}
