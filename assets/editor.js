import { html } from "https://unpkg.com/htl@0.2.0/src/index.js"

import { PlutoConnection } from "./common/PlutoConnection.js"
import { utf8index_to_ut16index } from "./common/UnicodeTools.js"

import { statistics } from "./feedback.js"

import "./common/SetupCellEnvironment.js"
import "./common/GlobalShortKeys.js"

import { html as preacthtml, Component, render } from "https://unpkg.com/htm/preact/standalone.module.js"
import { CellOutput } from "./components/CellOutput.js"
import { CellInput } from "./components/Cell.js"
import { FilePicker } from "./components/FilePicker.js"

/* REMOTE NOTEBOOK LIST */

function updateLocalNotebookPath(newPath) {
    window.filePickerCodeMirror.setValue(newPath)

    const fileName = newPath.split("/").pop().split("\\").pop()
    const cuteName = "🎈 " + fileName + " ⚡ Pluto.jl ⚡"
    document.title = cuteName
}

export let remoteNotebookList = []

function updateRemoteNotebooks(list) {
    const oldPath = notebook.path

    remoteNotebookList = list
    list.forEach((nb) => {
        if (nb.uuid == notebook.uuid) {
            notebook = nb
            updateLocalNotebookPath(nb.path)
        }
    })

    updateRecentNotebooks(oldPath)
}

/* RESPONSE FUNCTIONS TO REMOTE CHANGES */

export let localCells = {}
export let codeMirrors = {}


function updateAnyCodeDiffers(hint = false) {
    document.body.classList.toggle("code-differs", hint || document.querySelector("notebook>cell.code-differs") != null)
}


function updateLocalCellOutput(cellNode, msg) {
    statistics.numRuns++

    const outputNode = cellNode.querySelector(":scope > celloutput")

    const oldHeight = outputNode.scrollHeight
    const oldScroll = window.scrollY

    // Cell classes:
    cellNode.classList.toggle("running", msg.running)
    cellNode.classList.toggle("output-notinsync", msg.output == null)
    cellNode.classList.toggle("has-assignee", !msg.errored && msg.rootassignee != null)
    cellNode.classList.toggle("inline-output", !msg.errored && !!msg.output && (msg.mime == "application/vnd.pluto.tree+xml" || msg.mime == "text/plain"))
    cellNode.classList.toggle("error", msg.errored)

    // 👉👉👉👉 render now


    // (see bond.js)
    document.dispatchEvent(new CustomEvent("celloutputchanged", { detail: { cell: cellNode, mime: msg.mime } }))

    if (!allCellsCompleted && !notebookNode.querySelector(":scope > cell.running")) {
        allCellsCompleted = true
        allCellsCompletedPromise.resolver()
    }

    // Scroll the page to compensate for changes in page height:
    const newHeight = outputNode.scrollHeight
    const newScroll = window.scrollY

    if (notebookNode.querySelector("cell:focus-within")) {
        const cellsAfterFocused = notebookNode.querySelectorAll("cell:focus-within ~ cell")
        if (cellsAfterFocused.length == 0 || !Array.from(cellsAfterFocused).includes(cellNode)) {
            window.scrollTo(window.scrollX, oldScroll + (newHeight - oldHeight))
        }
    }
}

function updateLocalCellInput(byMe, cellNode, code, folded) {
    const cm = codeMirrors[cellNode.id]
    cellNode.remoteCode = code
    const oldVal = cm.getValue()
    // We don't want to update the cell's input if we sent the update.
    // This might be annoying if you change the cell after the submission,
    // while the request is still running. This also prevents the codemirror cursor
    // position from jumping back to (0,0).
    if (oldVal == "" || !byMe) {
        cm.setValue(code)

        // Silly code to make codemirror visible, then refresh, then make invisible again (if the code was hidden)
        const inputNode = cellNode.querySelector("cellinput")
        inputNode.style.display = "inline"
        inputNode.offsetTop
        cm.refresh()
        inputNode.style.display = null

        cellNode.classList.remove("code-differs")
    } else if (oldVal == code) {
        cellNode.classList.remove("code-differs")
    }

    updateAnyCodeDiffers()
    foldLocalCell(cellNode, folded)
}

function indexOfLocalCell(cellNode) {
    // .indexOf doesn't work on HTMLCollection
    for (let i = 0; i < notebookNode.children.length; i++) {
        if (notebookNode.children[i].id == cellNode.id) {
            return i
        }
    }
}


function foldLocalCell(cellNode, newFolded) {
    if (newFolded) {
        cellNode.classList.add("code-folded")
    } else {
        cellNode.classList.remove("code-folded")
        // Force redraw:
        cellNode.offsetTop
        codeMirrors[cellNode.id].refresh()
    }
}

function deleteLocalCell(cellNode) {
    // TODO: event listeners? gc?
    const uuid = cellNode.id
    try {
        delete codeMirrors[uuid]
    } catch (err) {}
    try {
        delete localCells[uuid]
    } catch (err) {}

    cellNode.remove()
}

function moveLocalCell(cellNode, newIndex) {
    // If you append or insert a DOM element that is already a child, then it will move that child.
    // So we have the lucky effect that this method works for both use cases: `cellNode` is not yet attached to DOM, and `cellNode` is already in the `notebookNode`.

    if (newIndex == notebookNode.children.length) {
        notebookNode.appendChild(cellNode)
    } else if (newIndex < notebookNode.children.length) {
        notebookNode.insertBefore(cellNode, notebookNode.children[newIndex])
    } else {
        console.error("Tried to insert cell at illegal position! Notebook order might be messed up!")
        notebookNode.appendChild(cellNode)
    }
}

function deleteAllLocalCells() {
    for (let uuid in localCells) {
        deleteLocalCell(localCells[uuid])
    }
}

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


/* SERVER CONNECTION */

function onUpdate(update, byMe) {
    const message = update.message

    switch (update.type) {
        case "cell_output":
            updateLocalCellOutput(localCells[update.cellID], message)
            break
        case "cell_running":
            // TODO: catch exception
            localCells[update.cellID].classList.add("running")
            break
        case "cell_folded":
            foldLocalCell(localCells[update.cellID], message.folded)
            break
        case "cell_input":
            // TODO: catch exception
            updateLocalCellInput(byMe, localCells[update.cellID], message.code, message.folded)
            break
        case "cell_deleted":
            // TODO: catch exception
            deleteLocalCell(localCells[update.cellID])
            break
        case "cell_moved":
            // TODO: catch exception
            moveLocalCell(localCells[update.cellID], message.index)
            break
        case "cell_added":
            createLocalCell(message.index, update.cellID, "", true)
            break
        case "notebook_list":
            // TODO: catch exception
            updateRemoteNotebooks(message.notebooks)
            break
        case "eval":
            new Function(update.message.script)()
            break
        case "bond_update":
            // TODO
            break
        default:
            const custom = window.customPlutoListeners[update.type]
            if (custom) {
                custom(update)
                break
            }
            console.error("Received unknown update type!")
            console.log(update)
            alert("Something went wrong 🙈\n Try clearing your cache and refreshing the page")
            break
    }
}

window.customPlutoListeners = {}

function onEstablishConnection() {
    const runAll = client.plutoENV["PLUTO_RUN_NOTEBOOK_ON_LOAD"] == "true"
    // on socket success
    client.send("getallnotebooks", {})

    client
        .sendreceive("getallcells", {})
        .then((update) => {
            const promises = []

            update.message.cells.forEach((cell, index) => {
                const cellNode = createLocalCell(index, cell.uuid, "", false)
                cellNode.classList.add("output-notinsync")
                runAll && cellNode.classList.add("running")
                promises.push(
                    client.sendreceive("getinput", {}, cell.uuid).then((u) => {
                        updateLocalCellInput(true, cellNode, u.message.code, u.message.folded)
                    })
                )
                promises.push(
                    client.sendreceive("getoutput", {}, cell.uuid).then((u) => {
                        if (!runAll || cellNode.classList.contains("running")) {
                            updateLocalCellOutput(cellNode, u.message)
                        } else {
                            // the cell completed running asynchronously, after Pluto received and processed the :getouput request, but before this message was added to this client's queue.
                        }
                    })
                )
            })

            Promise.all(promises).then(() => {
                document.body.classList.remove("loading")
                console.info("Workspace initialized")
            })
        })
        .catch(console.error)

    client.fetchPlutoVersions().then((versions) => {
        const remote = versions[0]
        const local = versions[1]

        console.log(local)
        if (remote != local) {
            const rs = remote.split(".")
            const ls = local.split(".")

            // while we are in alpha, we also notify for patch updates.
            if (rs[0] != ls[0] || rs[1] != ls[1] || true) {
                alert(
                    "A new version of Pluto.jl is available! 🎉\n\n    You have " +
                        local +
                        ", the latest is " +
                        remote +
                        ".\n\nYou can update Pluto.jl using the julia package manager.\nAfterwards, exit Pluto.jl and restart julia."
                )
            }
        }
    })

    updateDocQuery()
}

function onReconnect() {
    document.body.classList.remove("disconnected")
    document.querySelector("meta[name=theme-color]").content = "#fff"
    for (let uuid in codeMirrors) {
        codeMirrors[uuid].options.disableInput = false
    }
}

function onDisconnect() {
    document.body.classList.add("disconnected")
    document.querySelector("meta[name=theme-color]").content = "#DEAF91"
    setTimeout(() => {
        if (!client.currentlyConnected) {
            for (let uuid in codeMirrors) {
                codeMirrors[uuid].options.disableInput = true
            }
        }
    }, 5000)
}

/* LOCALSTORAGE NOTEBOOKS LIST */

function updateRecentNotebooks(alsodelete) {
    const storedString = localStorage.getItem("recent notebooks")
    const storedList = !!storedString ? JSON.parse(storedString) : []
    const oldpaths = storedList
    const newpaths = [notebook.path].concat(
        oldpaths.filter((path) => {
            return path != notebook.path && path != alsodelete
        })
    )
    localStorage.setItem("recent notebooks", JSON.stringify(newpaths.slice(0, 50)))
}

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
    requestMoveRemoteCell(dropee.id, dropIndex)
}

/* FONTS */

if ("fonts" in document) {
    document.fonts.ready.then(function () {
        console.log("fonts loaded")
        for (let uuid in codeMirrors) {
            codeMirrors[uuid].refresh()
        }
    })
}

/* LIVE DOCS */

window.desiredDocQuery = ""
window.displayedDocQuery = "nothing yet"
window.doc = document.querySelector("helpbox")

doc.querySelector("header").addEventListener("click", (e) => {
    doc.classList.toggle("hidden")
    updateDocQuery(window.desiredDocQuery)
})

let updateDocTimer = undefined

function updateDocQuery(query = undefined) {
    if (doc.classList.contains("hidden")) {
        doc.querySelector("header").innerText = "Live docs"
        doc.querySelector("section").innerHTML = "Start typing code to learn more!"
        window.displayedDocQuery = "the intro page 🍭"
        return
    }
    if (!/[^\s]/.test(query)) {
        // only whitespace
        return
    }

    if (query == undefined) {
        query = window.desiredDocQuery
    }
    if (query == displayedDocQuery) {
        return
    }

    window.desiredDocQuery = query

    if (doc.classList.contains("loading")) {
        updateDocTimer = setTimeout(() => {
            updateDocQuery()
        }, 1000)
        return
    }

    doc.classList.add("loading")
    client.sendreceive("docs", { query: query }).then((u) => {
        if (u.message.status == "⌛") {
            updateDocTimer = setTimeout(() => {
                doc.classList.remove("loading")
                updateDocQuery()
            }, 1000)
            return
        }
        doc.classList.remove("loading")
        window.displayedDocQuery = query
        if (u.message.status == "👍") {
            doc.querySelector("header").innerText = query
            doc.querySelector("section").innerHTML = u.message.doc
            MathJax.typeset([doc.querySelector("section")])
        }
    })
}

/* CHANGES THAT YOU MADE MIGHT NOT BE SAVED */

window.addEventListener("beforeunload", (event) => {
    const firstUnsaved = document.querySelector("notebook>cell.code-differs")
    if (firstUnsaved) {
        console.log("preventing unload")
        codeMirrors[firstUnsaved.id].focus()
        event.stopImmediatePropagation()
        event.preventDefault()
        event.returnValue = ""
    }
})