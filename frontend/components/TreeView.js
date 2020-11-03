import { html, Component, useRef, useLayoutEffect, useEffect } from "../imports/Preact.js"

import { cl } from "../common/ClassTable.js"

import { observablehq_for_cells } from "../common/SetupCellEnvironment.js"

import { PlutoImage, RawHTMLContainer } from "./CellOutput.js"

const SimpleOutputBody = ({ mime, body, cell_id, all_completed_promise, requests, compensate_scrollheight_ref, persist_js_state }) => {
    switch (mime) {
        case "image/png":
        case "image/jpg":
        case "image/jpeg":
        case "image/gif":
        case "image/bmp":
        case "image/svg+xml":
            return html`<${PlutoImage} mime=${mime} body=${body} compensate_scrollheight_ref=${undefined} />`
            break
        case "text/html":
            return html`<${RawHTMLContainer}
                body=${body}
                all_completed_promise=${all_completed_promise}
                requests=${requests}
                compensate_scrollheight_ref=${compensate_scrollheight_ref}
                persist_js_state=${persist_js_state}
            />`
            break
        case "application/vnd.pluto.tree+object":
            return html`<${TreeView}
                body=${body}
                all_completed_promise=${all_completed_promise}
                requests=${requests}
                compensate_scrollheight_ref=${undefined}
                persist_js_state=${persist_js_state}
            />`
            break
        case "text/plain":
        default:
            return html`<pre>${body}</pre>`
            break
    }
}

export const TreeView = ({ mime, body, cell_id, all_completed_promise, requests, compensate_scrollheight_ref, persist_js_state }) => {
    console.log(body)

    var inner = null
    switch (body.type) {
        case "Array":
        case "Tuple":
            inner = html`${body.prefix}<jlarray class=${body.type}
                    >${body.elements.map((r) =>
                        r === "more"
                            ? html`<r><more></more></r>`
                            : html`<r
                                  ><k>${r[0]}</k
                                  ><v
                                      ><${SimpleOutputBody}
                                          mime=${r[1][1]}
                                          body=${r[1][0]}
                                          all_completed_promise=${all_completed_promise}
                                          requests=${requests}
                                          compensate_scrollheight_ref=${undefined}
                                          persist_js_state=${persist_js_state} /></v
                              ></r>`
                    )}</jlarray
                >`
            break
            break
        case "Dict":
        case "NamedTuple":
            inner = html`<jldict class=${body.type}
                >${body.elements.map((r) =>
                    r === "more"
                        ? html`<r><more></more></r>`
                        : html`<r
                              ><k
                                  ><${SimpleOutputBody}
                                      mime=${r[0][1]}
                                      body=${r[0][0]}
                                      all_completed_promise=${all_completed_promise}
                                      requests=${requests}
                                      compensate_scrollheight_ref=${undefined}
                                      persist_js_state=${persist_js_state} /></k
                              ><v
                                  ><${SimpleOutputBody}
                                      mime=${r[1][1]}
                                      body=${r[1][0]}
                                      all_completed_promise=${all_completed_promise}
                                      requests=${requests}
                                      compensate_scrollheight_ref=${undefined}
                                      persist_js_state=${persist_js_state} /></v
                          ></r>`
                )}</jldict
            >`
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

window.onjltreeclickmore = (self, e) => {
    if (e.target !== self || self.closest("jltree.collapsed") != null) {
        return
    }
    var parent_tree = self.closest("jltree")
    const objectid = parent_tree.getAttribute("objectid")

    const notebook = self.closest("pluto-notebook")

    // TODO actually do something
    console.log(notebook.requests)
}
