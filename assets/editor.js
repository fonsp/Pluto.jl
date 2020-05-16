

/* REMOTE NOTEBOOK LIST */

var notebook = {
    path: "unknown",
    uuid: document.location.search.split("uuid=")[1],
}

function updateLocalNotebookPath(newPath) {
    window.filePickerCodeMirror.setValue(newPath)

    fileName = newPath.split("/").pop().split("\\").pop()
    cuteName = "🎈 " + fileName + " ⚡ Pluto.jl ⚡"
    document.title = cuteName
}

var remoteNotebookList = []

function updateRemoteNotebooks(list) {
    remoteNotebookList = list
    list.forEach(nb => {
        if (nb.uuid == notebook.uuid) {
            notebook = nb
            updateLocalNotebookPath(nb.path)
        }
    })
}

/* DOM THINGIES */

document.querySelector("preamble>button.runallchanged").onclick = (e) => {
    requestRunAllChangedRemoteCells()
}

const cellTemplate = document.querySelector("#celltemplate").content.firstElementChild
const notebookNode = document.querySelector("notebook")

/* FILE PICKER */

const submitFileButton = document.querySelector("header>#logocontainer>filepicker>button")
submitFileButton.addEventListener("click", submitFileChange)

function submitFileChange() {
    const oldPath = window.notebook.path
    const newPath = window.filePickerCodeMirror.getValue()
    if (oldPath == newPath) {
        return
    }
    if (confirm("Are you sure? Will move from\n\n" + oldPath + "\n\nto\n\n" + newPath)) {
        document.body.classList.add("loading")
        client.sendreceive("movenotebookfile", {
            path: newPath,
        }).then(u => {
            updateLocalNotebookPath(notebook.path)
            document.body.classList.remove("loading")

            if (u.message.success) {
                document.activeElement.blur()
            } else {
                updateLocalNotebookPath(oldPath)
                alert("Failed to move file:\n\n" + u.message.reason)
            }
        })
    } else {
        updateLocalNotebookPath(oldPath)
    }
}

window.filePickerCodeMirror = createCodeMirrorFilepicker((elt) => {
    document.querySelector("header>#logocontainer>filepicker").insertBefore(
        elt,
        submitFileButton)
}, submitFileChange, () => updateLocalNotebookPath(notebook.path), true)

window.filePickerCodeMirror.on("blur", (cm, e) => {
    // if the user clicks on an autocomplete option, this event is called, even though focus was not actually lost.
    // debounce:
    setTimeout(() => {
        if (!cm.hasFocus()) {
            updateLocalNotebookPath(notebook.path)
        }
    }, 250)
})

/* RESPONSE FUNCTIONS TO REMOTE CHANGES */

window.localCells = {}
window.codeMirrors = {}

function createCodeMirrorInsideCell(cellNode, code) {
    var cm = CodeMirror((elt) => {
        cellNode.querySelector("cellinput").appendChild(elt)
    }, {
        value: code,
        lineNumbers: true,
        mode: "julia",
        lineWrapping: true,
        viewportMargin: Infinity,
        placeholder: "Enter cell code...",
        indentWithTabs: true,
        indentUnit: 4,
        hintOptions: { hint: juliahints },
        matchBrackets: true,
    });

    window.codeMirrors[cellNode.id] = cm
    //cm.setOption("readOnly", true);

    cm.setOption("extraKeys", {
        "Ctrl-Enter": () => requestChangeRemoteCell(cellNode.id),
        "Shift-Enter": () => {
            requestNewRemoteCell(indexOfLocalCell(cellNode) + 1)
            requestChangeRemoteCell(cellNode.id)
        },
        "Ctrl-Shift-Delete": () => {
            requestDeleteRemoteCell(cellNode.id)
            const nextCell = cellNode.nextSibling
            if (nextCell) {
                codeMirrors[nextCell.id].focus()
            }
        },
        "Shift-Tab": "indentLess",
        "Tab": onTabKey,
    });

    cm.on("change", (cm, change) => {
        // TODO: optimise
        const differs = cm.getValue() != cellNode.remoteCode

        cellNode.classList.toggle("code-differs", differs)
        updateAnyCodeDiffers()
    })

    cm.on("cursorActivity", (cm) => {
        const token = cm.getTokenAt(cm.getCursor())

        if (token.type != null && token.type != "string") {
            updateDocQuery(token.string)
        }
    });

    cm.on("blur", (cm, e) => {
        if (document.hasFocus()) {
            cm.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 0 }, { scroll: false })
            if (!cellNode.classList.contains("code-differs") && cellNode.remoteCode == "") {
                requestDeleteRemoteCell(cellNode.id)
            }
        }
    })

    return cm
}

function updateAnyCodeDiffers(hint = false) {
    document.body.classList.toggle("code-differs", hint || (document.querySelector("notebook>cell.code-differs") != null))
}

function prettytime(time_ns) {
    if (time_ns == null) {
        return cellTemplate.querySelector(":scope > runarea > span").innerText
        // i.e.
        // return "---"
    }
    const prefices = ["n", "μ", "m", ""]
    var i = 0
    while (i < prefices.length && time_ns >= 1000.0) {
        i += 1
        time_ns /= 1000
    }
    var roundedtime
    if (time_ns >= 100.0) {
        roundedtime = Math.round(time_ns)
    } else {
        roundedtime = Math.round(time_ns * 10) / 10
    }
    return roundedtime + '\xa0' + prefices[i] + "s"
}

function updateLocalCellOutput(cellNode, msg) {
    window.statistics.numRuns++

    if (msg.running) {
        cellNode.classList.add("running")
    } else {
        cellNode.classList.remove("running")
    }
    cellNode.runtime = msg.runtime
    cellNode.querySelector(":scope > runarea > span").innerText = prettytime(msg.runtime)

    const outputNode = cellNode.querySelector(":scope > celloutput")
    const assigneeNode = outputNode.querySelector(":scope > assignee")
    const containerNode = outputNode.querySelector(":scope > div")

    oldHeight = outputNode.scrollHeight
    oldScroll = window.scrollY

    cellNode.classList.remove("has-assignee")
    cellNode.classList.remove("inline-output")
    cellNode.classList.remove("error")

    if (msg.errormessage) {
        cellNode.classList.add("error")

        if (msg.mime == "text/plain") {
            containerNode.innerHTML = "<pre><code></code></pre>"
            containerNode.querySelector("code").innerHTML = rewrittenError(msg.errormessage)
        } else {
            const render = render_error(JSON.parse(msg.errormessage), cellNode)
            containerNode.innerHTML = ""
            containerNode.appendChild(render)
        }
    } else {
        cellNode.classList.toggle("has-assignee", msg.rootassignee != null)

        assigneeNode.innerText = msg.rootassignee


        if (msg.mime == "text/html" || msg.mime == "image/svg+xml" || msg.mime == "application/vnd.pluto.tree+xml") {
            containerNode.innerHTML = msg.output

            if (msg.mime == "application/vnd.pluto.tree+xml") {
                cellNode.classList.add("inline-output")
            }

            // based on https://stackoverflow.com/a/26716182
            // to execute all scripts in the output html:
            try {
                Array.from(containerNode.querySelectorAll("script")).map((script) => {
                    if (script.src != "") {
                        if (!Array.from(document.head.querySelectorAll("script")).map(s => s.src).includes(script)) {
                            const tag = document.createElement("script")
                            tag.src = script.src
                            document.head.appendChild(tag)
                        }
                    } else {
                        const result = Function(script.innerHTML).bind(containerNode)()
                        if (result && result.nodeType === Node.ELEMENT_NODE) {
                            script.parentElement.insertBefore(result, script)
                        }
                    }
                })
            } catch (err) {
                console.error("Couldn't execute script:")
                console.error(err)
                // TODO: relay to user
                // might be wise to wait after adding scripts to head
            }

            // convert LaTeX to svg
            try {
                MathJax.typeset([containerNode])
            } catch (err) {
                console.info("Failed to typeset TeX:")
                console.info(err)
            }
        } else if (msg.mime == "image/png" || msg.mime == "image/jpg" || msg.mime == "image/gif") {
            var i = undefined
            if (containerNode.children.length == 1 && containerNode.children[0].tagName == "IMG") {
                // https://github.com/fonsp/Pluto.jl/issues/95
                // images are loaded asynchronously and don't initiate with the final height.
                // we fix this by reusing the old image
                i = containerNode.children[0]
                new Array("width", "height", "alt", "sizes", "srcset").map(attr => i.removeAttribute(attr))
            } else {
                i = document.createElement("img")
                containerNode.innerHTML = ""
                containerNode.appendChild(i)
            }
            i.src = msg.output
        } else {
            if (msg.output) {
                containerNode.innerHTML = "<pre><code></code></pre>"
                cellNode.classList.add("inline-output")
                containerNode.querySelector("code").innerText = msg.output
            } else {
                containerNode.innerHTML = ""
            }
        }
    }
    document.dispatchEvent(new CustomEvent("celloutputchanged", { detail: { cell: cellNode, mime: msg.mime } }))
    if (msg.output == null && msg.errormessage == null) {
        cellNode.classList.add("output-notinsync")
    } else {
        cellNode.classList.remove("output-notinsync")
    }

    newHeight = outputNode.scrollHeight
    newScroll = window.scrollY

    if (!allCellsCompleted && !notebookNode.querySelector(":scope > cell.running")) {
        window.allCellsCompleted = true
        window.allCellsCompletedPromise.resolver()
    }

    if (document.body.classList.contains("loading")) {
        return
    }
    const cellsAfterFocused = notebookNode.querySelectorAll("cell:focus-within ~ cell")
    if (cellsAfterFocused.length == 0 || !Array.from(cellsAfterFocused).includes(cellNode)) {
        window.scrollTo(window.scrollX, oldScroll + (newHeight - oldHeight))
    }
}

function updateLocalCellInput(byMe, cellNode, code, folded) {
    var cm = window.codeMirrors[cellNode.id]
    cellNode.remoteCode = code
    oldVal = cm.getValue()
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
    for (var i = 0; i < notebookNode.children.length; i++) {
        if (notebookNode.children[i].id == cellNode.id) {
            return i
        }
    }
}

function createLocalCell(newIndex, uuid, code, focus = true) {
    if (uuid in window.localCells) {
        console.warn("Tried to add cell with existing UUID. Canceled.")
        console.log(uuid)
        console.log(localCells)
        return window.localCells[uuid]
    }
    var newCellNode = cellTemplate.cloneNode(true)
    newCellNode.id = uuid
    newCellNode.remoteCode = code

    window.localCells[uuid] = newCellNode

    moveLocalCell(newCellNode, newIndex)

    editor = createCodeMirrorInsideCell(newCellNode, code)
    focus && editor.focus()

    // EVENT LISTENERS FOR CLICKY THINGS

    newCellNode.querySelector("button.foldcode").onclick = (e) => {
        requestCodeFoldRemoteCell(uuid, !newCellNode.classList.contains("code-folded"))
    }

    newCellNode.querySelector("button.addcell.before").onclick = (e) => {
        requestNewRemoteCell(indexOfLocalCell(newCellNode))
    }
    newCellNode.querySelector("button.addcell.after").onclick = (e) => {
        requestNewRemoteCell(indexOfLocalCell(newCellNode) + 1)
    }
    newCellNode.querySelector("button.deletecell").onclick = (e) => {
        if (Object.keys(localCells).length <= 1) {
            requestNewRemoteCell(0)
        }
        requestDeleteRemoteCell(newCellNode.id)
    }
    newCellNode.querySelector("button.runcell").onclick = (e) => {
        if (newCellNode.classList.contains("running")) {
            newCellNode.classList.add("error")
            requestInterruptRemote()
        } else {
            requestChangeRemoteCell(newCellNode.id)
        }
    }

    return newCellNode
}

function foldLocalCell(cellNode, newFolded) {
    if (newFolded) {
        cellNode.classList.add("code-folded")
    } else {
        cellNode.classList.remove("code-folded")
        // Force redraw:
        cellNode.offsetTop
        editor.refresh()
    }
}

function deleteLocalCell(cellNode) {
    // TODO: event listeners? gc?
    uuid = cellNode.id
    try {
        delete window.codeMirrors[uuid]
    } catch (err) { }
    try {
        delete window.localCells[uuid]
    } catch (err) { }

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
    for (var uuid in window.localCells) {
        deleteLocalCell(window.localCells[uuid])
    }
}

/* REQUEST FUNCTIONS FOR REMOTE CHANGES */

window.allCellsCompleted = true // will be set to false soon
window.allCellsCompletedPromise = null

function refreshAllCompletionPromise() {
    if (allCellsCompleted) {
        var resolver
        window.allCellsCompletedPromise = new Promise(r => { resolver = r })
        window.allCellsCompletedPromise.resolver = resolver
        window.allCellsCompleted = false
    }
}

window.refreshAllCompletionPromise = refreshAllCompletionPromise
refreshAllCompletionPromise()

function requestChangeRemoteCell(uuid, createPromise = false) {
    window.statistics.numEvals++

    refreshAllCompletionPromise()
    window.localCells[uuid].classList.add("running")
    newCode = window.codeMirrors[uuid].getValue()

    return client.send("changecell", { code: newCode }, uuid, createPromise)
}

function requestRunAllChangedRemoteCells() {
    refreshAllCompletionPromise()

    const changed = Array.from(notebookNode.querySelectorAll("cell.code-differs"))
    const promises = changed.map(cellNode => {
        const uuid = cellNode.id
        cellNode.classList.add("running")
        return client.sendreceive("setinput", {
            code: window.codeMirrors[uuid].getValue()
        }, uuid).then(u => {
            updateLocalCellInput(true, cellNode, u.message.code, u.message.folded)
        })
    })
    Promise.all(promises).then(() => {
        client.send("runmultiple", {
            cells: changed.map(c => c.id)
        })
    }).catch(console.error)
}

function requestRunAllRemoteCells() {
    refreshAllCompletionPromise()

    const uuids = Object.values(window.localCells).map(cellNode => {
        cellNode.classList.add("running")
        return cellNode.id
    })
    client.send("runmultiple", {
        cells: uuids
    })
}

function requestInterruptRemote() {
    client.send("interruptall", {})
}

// Indexing works as if a new cell is added.
// e.g. if the third cell (at js-index 2) of [0, 1, 2, 3, 4]
// is moved to the end, that would be new js-index = 5
function requestMoveRemoteCell(uuid, newIndex) {
    client.send("movecell", { index: newIndex }, uuid)
}

function requestNewRemoteCell(newIndex) {
    client.send("addcell", { index: newIndex })
}

function requestDeleteRemoteCell(uuid) {
    window.localCells[uuid].classList.add("running")
    window.codeMirrors[uuid].setValue("")
    client.send("deletecell", {}, uuid)
}

function requestCodeFoldRemoteCell(uuid, newFolded) {
    client.send("foldcell", { folded: newFolded }, uuid)
}


/* SERVER CONNECTION */

function onUpdate(update, byMe) {
    var message = update.message

    switch (update.type) {
        case "cell_output":
            updateLocalCellOutput(window.localCells[update.cellID], message)
            break
        case "cell_running":
            // TODO: catch exception
            window.localCells[update.cellID].classList.add("running")
            break
        case "cell_folded":
            foldLocalCell(window.localCells[update.cellID], message.folded)
            break
        case "cell_input":
            // TODO: catch exception
            updateLocalCellInput(byMe, window.localCells[update.cellID], message.code, message.folded)
            break
        case "cell_deleted":
            // TODO: catch exception
            deleteLocalCell(window.localCells[update.cellID])
            break
        case "cell_moved":
            // TODO: catch exception
            moveLocalCell(window.localCells[update.cellID], message.index)
            break
        case "cell_added":
            createLocalCell(message.index, update.cellID, "", true)
            break
        case "notebook_list":
            // TODO: catch exception
            updateRemoteNotebooks(message.notebooks)
            break
        case "eval":
            (new Function(update.message.script))()
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

    client.sendreceive("getallcells", {}).then(update => {
        const promises = []

        update.message.cells.forEach((cell, index) => {
            const cellNode = createLocalCell(index, cell.uuid, "", false)
            cellNode.classList.add("output-notinsync")
            runAll && cellNode.classList.add("running")
            promises.push(
                client.sendreceive("getinput", {}, cell.uuid).then(u => {
                    updateLocalCellInput(true, cellNode, u.message.code, u.message.folded)
                })
            )
            promises.push(
                client.sendreceive("getoutput", {}, cell.uuid).then(u => {
                    updateLocalCellOutput(cellNode, u.message)
                })
            )
        })

        Promise.all(promises).then(() => {
            function happy() {
                document.body.classList.remove("loading")
                console.info("Workspace initialized")
            }
            if (runAll
                && !document.querySelector("notebook>cell.running")
                && document.querySelector("notebook>cell.output-notinsync")) {
                requestRunAllRemoteCells()
                window.allCellsCompletedPromise.then(happy)
            } else {
                // We do a code completion request to trigger starting the workpsace
                client.sendreceive("complete", {
                    query: "nothinginparticular"
                }).then(happy)
            }
        })
    }).catch(console.error)

    client.fetchPlutoVersions().then(versions => {
        const remote = versions[0]
        const local = versions[1]

        console.log(local)
        if (remote != local) {
            var rs = remote.split(".")
            var ls = local.split(".")

            // while we are in alpha, we also notify for patch updates.
            if (rs[0] != ls[0] || rs[1] != ls[1] || true) {
                alert("A new version of Pluto.jl is available! 🎉\n\n    You have " + local + ", the latest is " + remote + ".\n\nYou can update Pluto.jl using the julia package manager.\nAfterwards, exit Pluto.jl and restart julia.")
            }
        }
    })

}

function onReconnect() {
    document.body.classList.remove("disconnected")
    document.querySelector("meta[name=theme-color]").content = "#fff"
    for (var uuid in window.codeMirrors) {
        window.codeMirrors[uuid].options.disableInput = false
    }
}

function onDisconnect() {
    document.body.classList.add("disconnected")
    document.querySelector("meta[name=theme-color]").content = "#DEAF91"
    setTimeout(() => {
        if (!client.currentlyConnected) {
            for (var uuid in window.codeMirrors) {
                window.codeMirrors[uuid].options.disableInput = true
            }
        }
    }, 5000)
}

window.client = new PlutoConnection(onUpdate, onEstablishConnection, onReconnect, onDisconnect)
client.notebookID = notebook.uuid
client.initialize()


/* DRAG-DROPPING CELLS */

function argmin(x) {
    var best_val = Infinity
    var best_index = -1
    var val
    for (var i = 0; i < x.length; i++) {
        val = x[i]
        if (val < best_val) {
            best_index = i
            best_val = val
        }
    }
    return best_index
}

dropruler = document.querySelector("dropruler")

var dropPositions = []
var dropee = null
document.ondragstart = (e) => {
    if (e.target.tagName != "CLICKSHOULDER") {
        dropee = null
        return
    }
    dropee = e.target.parentElement
    dropruler.style.display = "block"

    dropPositions = []
    for (var i = 0; i < notebookNode.children.length; i++) {
        dropPositions.push(notebookNode.children[i].offsetTop)
    }
    dropPositions.push(notebookNode.lastChild.offsetTop + notebookNode.lastChild.scrollHeight)
}
document.ondragover = (e) => {
    // Called continuously during drag
    dist = dropPositions.map(p => Math.abs(p - e.pageY))
    dropIndex = argmin(dist)

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
    dist = dropPositions.map(p => Math.abs(p - e.pageY))
    dropIndex = argmin(dist)


    requestMoveRemoteCell(dropee.id, dropIndex)
}

/* FONTS */

if ("fonts" in document) {
    document.fonts.ready.then(function () {
        console.log("fonts loaded");
        for (var uuid in window.codeMirrors) {
            window.codeMirrors[uuid].refresh()
        }
    });
}

/* AUTOCOMPLETE */

const noAutocomplete = " \t\r\n([])+-=/,:;'\"!#$%^&*~`<>|"

function onTabKey(cm) {
    const cursor = cm.getCursor()
    const oldLine = cm.getLine(cursor.line)

    if (cm.somethingSelected()) {
        cm.indentSelection()
    } else {
        if (cursor.ch > 0 && noAutocomplete.indexOf(oldLine[cursor.ch - 1]) == -1) {
            cm.showHint()
        } else {
            cm.replaceSelection('\t')
        }
    }
}

function juliahints(cm, option) {
    const cursor = cm.getCursor()
    const oldLine = cm.getLine(cursor.line)
    const oldLineSliced = oldLine.slice(0, cursor.ch)

    return client.sendreceive("complete", {
        query: oldLineSliced,
    }).then(update => {
        return {
            list: update.message.results,
            from: CodeMirror.Pos(cursor.line, utf8index_to_ut16index(oldLine, update.message.start)),
            to: CodeMirror.Pos(cursor.line, utf8index_to_ut16index(oldLine, update.message.stop)),
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

var updateDocTimer = undefined

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
    client.sendreceive("docs", { query: query }).then(u => {
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
        }
    })
}

updateDocQuery()

/* ERRORS */

function render_filename(frame, ctx) {
    const sep_index = frame.file.indexOf("#==#")
    if (sep_index != -1) {
        const uuid = frame.file.substr(sep_index + 4)
        const a = DOM.element("a", { href: "#" + uuid + "#" + frame.line, onclick: "window.cellRedirect(event)" })
        if(uuid == ctx.id){
            a.innerText = "Local:" + frame.line
        } else {
            a.innerText = "Other:" + frame.line
        }
        return html`<em>${a}</em>`
    } else {
        return html`<em>${frame.file}:${frame.line}</em>`
    }
}

function render_funccall(frame, ctx) {
    const bracket_index = frame.call.indexOf("(")
    if(bracket_index != -1){
        return html`<mark><strong>${frame.call.substr(0,bracket_index)}</strong>${frame.call.substr(bracket_index)}</mark>`
    } else {
        return html`<mark><strong>${frame.call}</strong></mark>`
    }
}

function render_error(state, ctx) {
    return html`
	<jlerror>
		<header>
			${rewrittenError(state.msg).split("\n").map(line => html`<p>${line}</p>`)}
		</header>
        <section style="display: ${state.stacktrace.length == 0 ? "none" : "potato"};">
			<ol>
			${state.stacktrace.map(frame => html`
				<li>
					${render_funccall(frame, ctx)}<span>@</span>${render_filename(frame, ctx)}${frame.inlined ? html`<span>[inlined]</span>` : []}
				</li>`
    )}
			</ol>
		</section>
	</jltree>`
}

function cellRedirect(event) {
    const url = new URL(event.target.href).hash
    const uuid = url.substr(1, 36)
    const line = url.substr(38)
    window.codeMirrors[uuid].setSelection({ line: 0, ch: 0 }, { line: Infinity, ch: Infinity }, { scroll: true })
    window.codeMirrors[uuid].focus()
}


const errorRewrites = [
    {
        from: "syntax: extra token after end of expression",
        to: "Multiple expressions in one cell.\n<a href=\"#\" onclick=\"errorHint(event)\">Wrap all code in a `begin ... end` block.</a>",
    },
]

function rewrittenError(old_raw) {
    var new_raw = old_raw;
    errorRewrites.forEach(rw => {
        new_raw = new_raw.replace(rw.from, rw.to)
    })
    return new_raw
}

function errorHint(e) {
    const cellNode = e.target.parentElement.parentElement.parentElement.parentElement.parentElement
    wrapInBlock(window.codeMirrors[cellNode.id], "begin")
    requestChangeRemoteCell(cellNode.id)
    e.preventDefault()
}

function wrapInBlock(cm, block = "begin") {
    const oldVal = cm.getValue()
    cm.setValue(block + "\n\t" + oldVal.replace(/\n/g, "\n\t") + '\n' + "end")
}

/* MORE SHORTKEYS */

document.addEventListener("keydown", (e) => {
    switch (e.keyCode) {
        case 81: // q
            if (e.ctrlKey) {
                if (document.querySelector("notebook>cell.running")) {
                    requestInterruptRemote()
                }
                e.preventDefault()
            }
            break
        case 82: // r
            if (e.ctrlKey) {
                if (window.notebook) {
                    document.location.href = "open?path=" + encodeURIComponent(notebook.path)
                    e.preventDefault()
                }
            }
            break
        case 83: // s
            if (e.ctrlKey) {
                filePickerCodeMirror.focus()
                filePickerCodeMirror.setSelection({ line: 0, ch: 0 }, { line: Infinity, ch: Infinity })
                e.preventDefault()
            }
            break
        case 191: // ? or /
            if (!(e.ctrlKey && e.shiftKey)) {
                break
            }
        // fall into:
        case 112: // F1
            // TODO: show help    
            alert(
                `Shortcuts 🎹

Ctrl+Enter:   run cell
Shift+Enter:   run cell and add cell below
Ctrl+Shift+Delete:   delete cell
Ctrl+Q:   interrupt notebook
Ctrl+S:   rename notebook`)

            e.preventDefault()
            break
    }
})

/* CHANGES THAT YOU MADE MIGHT NOT BE SAVED */

window.addEventListener('beforeunload', (event) => {
    const firstUnsaved = document.querySelector("notebook>cell.code-differs")
    if (firstUnsaved) {
        window.codeMirrors[firstUnsaved.id].focus()
        event.preventDefault();
        event.returnValue = '';
    }
});
