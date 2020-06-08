import { html } from "https://unpkg.com/htl@0.2.0/src/index.js"

import { PlutoConnection } from "./common/PlutoConnection.js"
import { utf8index_to_ut16index } from "./common/UnicodeTools.js"

import { statistics } from "./feedback.js"

import "./common/GlobalShortKeys.js"

import { html as preacthtml, Component, render } from "https://unpkg.com/htm/preact/standalone.module.js"
import { CellOutput } from "./components/CellOutput.js"
import { CellInput } from "./components/Cell.js"
import { FilePicker } from "./components/FilePicker.js"

/* REMOTE NOTEBOOK LIST */


/* RESPONSE FUNCTIONS TO REMOTE CHANGES */

export let localCells = {}
export let codeMirrors = {}



/* REQUEST FUNCTIONS FOR REMOTE CHANGES */

export let allCellsCompleted = true // will be set to false soon
export let allCellsCompletedPromise = null

export function refreshAllCompletionPromise() {
    if (allCellsCompleted) {
        let resolver
        allCellsCompletedPromise = new Promise((r) => {
            resolver = r
        })
        allCellsCompletedPromise.resolver = resolver
        allCellsCompleted = false
    }
}
refreshAllCompletionPromise()


/* DRAG-DROPPING CELLS */

function argmin(x) {
    let best_val = Infinity
    let best_index = -1
    let val
    for (let i = 0; i < x.length; i++) {
        val = x[i]
        if (val < best_val) {
            best_index = i
            best_val = val
        }
    }
    return best_index
}

let dropruler = document.querySelector("dropruler")

let dropPositions = []
let dropee = null
document.ondragstart = (e) => {
    if (e.target.tagName != "CELLSHOULDER") {
        dropee = null
        return
    }
    dropee = e.target.parentElement
    dropruler.style.display = "block"

    dropPositions = []
    for (let i = 0; i < notebookNode.children.length; i++) {
        dropPositions.push(notebookNode.children[i].offsetTop)
    }
    dropPositions.push(notebookNode.lastChild.offsetTop + notebookNode.lastChild.scrollHeight)
}

function getDropIndexOf(pageY) {
    const distances = dropPositions.map((p) => Math.abs(p - pageY))
    return argmin(distances)
}

document.ondragover = (e) => {
    // Called continuously during drag
    const dropIndex = getDropIndexOf(e.pageY)
    dropruler.style.top = dropPositions[dropIndex] + "px"
    e.preventDefault()
}
document.ondragend = (e) => {
    // Called after drag, also when dropped outside of the browser or when ESC is pressed
    dropruler.style.display = "none"
}
document.ondrop = (e) => {
    if (!dropee) {
        return
    }
    // Called when drag-dropped somewhere on the page
    const dropIndex = getDropIndexOf(e.pageY)
    this.props.move_remote_cell(dropee.id, dropIndex)
}

/* FONTS */

if ("fonts" in document) {
    document.fonts.ready.then(function () {
        console.log("fonts loaded")
        for (let cell_id in codeMirrors) {
            codeMirrors[cell_id].refresh()
        }
    })
}

/* LIVE DOCS */
