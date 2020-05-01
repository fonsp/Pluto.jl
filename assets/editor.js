document.addEventListener("DOMContentLoaded", () => {

    /* REMOTE NOTEBOOK LIST */

    const notebookID = document.location.search.split("uuid=")[1]
    var notebookPath = "unknown"

    function updateLocalNotebookPath(newPath) {
        notebookPath = newPath
        window.filePickerCodeMirror.setValue(newPath)

        fileName = newPath.split("/").pop().split("\\").pop()
        cuteName = "🎈 " + fileName + " ⚡ Pluto.jl ⚡"
        document.title = cuteName
    }

    window.remoteNotebookList = null

    function updateRemoteNotebooks(list) {
        window.remoteNotebookList = list
        list.forEach(nb => {
            if (nb.uuid == notebookID) {
                updateLocalNotebookPath(nb.path)
            }
        })
    }

    /* DOM THINGIES */

    document.querySelector("preamble>button.runall").onclick = (e) => {
        requestRunAllRemoteCells()
    }

    cellTemplate = document.querySelector("#celltemplate").content.firstElementChild
    notebookNode = document.querySelector("notebook")
    window.notebookNode = notebookNode

    /* FILE PICKER */

    const submitFileButton = document.querySelector("header>#logocontainer>filepicker>button")
    submitFileButton.addEventListener("click", submitFileChange)

    function submitFileChange() {
        const oldPath = notebookPath
        const newPath = window.filePickerCodeMirror.getValue()
        if (oldPath == newPath) {
            return
        }
        if (confirm("Are you sure? Will move from\n\n" + oldPath + "\n\nto\n\n" + newPath)) {
            document.body.classList.add("loading")
            client.sendreceive("movenotebookfile", {
                path: newPath,
            }).then(u => {
                updateLocalNotebookPath(notebookPath)
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
    }, submitFileChange, () => updateLocalNotebookPath(notebookPath), true)

    window.filePickerCodeMirror.on("blur", (cm, e) => {
        // if the user clicks on an autocomplete option, this event is called, even though focus was not actually lost.
        // debounce:
        setTimeout(() => {
            if (!cm.hasFocus()) {
                updateLocalNotebookPath(notebookPath)
            }
        }, 250)
    })

    /* RESPONSE FUNCTIONS TO REMOTE CHANGES */

    window.localCells = {}
    window.codeMirrors = {}

    function createCodeMirrorInsideCell(cellNode, code) {
        var editor = CodeMirror((elt) => {
            cellNode.querySelector("cellinput").appendChild(elt)
        }, {
            value: code,
            lineNumbers: true,
            mode: "julia",
            lineWrapping: true,
            lineNumberFormatter: function (i) {
                return "⋅" + i
            },
            // theme: "paraiso-light",
            viewportMargin: Infinity,
            placeholder: "Enter cell code...",
            indentWithTabs: true,
            indentUnit: 4,
            hintOptions: { hint: juliahints },
            matchBrackets: true,
        });

        window.codeMirrors[cellNode.id] = editor
        //editor.setOption("readOnly", true);

        editor.setOption("extraKeys", {
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

        editor.on("change", (cm, change) => {
            // TODO: optimise
            if (cm.getValue() != cellNode.remoteCode) {
                cellNode.classList.add("codediffers")
            } else {
                cellNode.classList.remove("codediffers")
            }
        })

        editor.on("cursorActivity", (cm) => {
            const token = cm.getTokenAt(cm.getCursor())

            if (token.type != null && token.type != "string") {
                updateDocQuery(token.string)
            }
        });

        return editor
    }

    function prettytime(time_ns) {
        if (time_ns == null) {
            return cellTemplate.querySelector("runarea>span").innerText
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
        if (msg.running) {
            cellNode.classList.add("running")
        } else {
            cellNode.classList.remove("running")
        }
        cellNode.querySelector("runarea>span").innerText = prettytime(msg.runtime)

        const outputNode = cellNode.querySelector("celloutput")

        oldHeight = outputNode.scrollHeight
        oldScroll = window.scrollY

        if (msg.errormessage) {
            outputNode.innerHTML = "<pre><code></code></pre>"
            outputNode.querySelector("code").innerHTML = rewrittenError(msg.errormessage)
            cellNode.classList.add("error")
        } else {
            cellNode.classList.remove("error")
            if (msg.mime == "text/html" || msg.mime == "image/svg+xml") {

                outputNode.innerHTML = msg.output

                // based on https://stackoverflow.com/a/26716182
                // to execute all scripts in the output html:
                try {
                    Array.from(outputNode.querySelectorAll("script")).map((script) => {
                        if (script.src != "") {
                            if (!Array.from(document.head.querySelectorAll("script")).map(s => s.src).includes(script)) {
                                const tag = document.createElement("script")
                                tag.src = script.src
                                document.head.appendChild(tag)
                            }
                        } else {
                            const result = Function(script.innerHTML).bind(outputNode)()
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
                MathJax.typeset()
            } else if (msg.mime == "image/png" || msg.mime == "image/jpg" || msg.mime == "image/gif") {
                var i = undefined
                if (outputNode.children.length == 1 && outputNode.children[0].tagName == "IMG") {
                    // https://github.com/fonsp/Pluto.jl/issues/95
                    // images are loaded asynchronously and don't initiate with the final height.
                    // we fix this by reusing the old image
                    i = outputNode.children[0]
                    new Array("width", "height", "alt", "sizes", "srcset").map(attr => i.removeAttribute(attr))
                } else {
                    i = document.createElement("img")
                    outputNode.innerHTML = ""
                    outputNode.appendChild(i)
                }
                i.src = msg.output
            } else {
                outputNode.innerHTML = "<pre><code></code></pre>"
                outputNode.querySelector("code").innerText = msg.output
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

        if (!allCellsCompleted && !notebookNode.querySelector("notebook>cell.running")) {
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
        var editor = window.codeMirrors[cellNode.id]
        cellNode.remoteCode = code
        oldVal = editor.getValue()
        // We don't want to update the cell's input if we sent the update.
        // This might be annoying if you change the cell after the submission,
        // while the request is still running. This also prevents the codemirror cursor
        // position from jumping back to (0,0).
        if (oldVal == "" || !byMe) {
            editor.setValue(code)

            // Silly code to make codemirror visible, then refresh, then make invisible again (if the code was hidden)
            cellNode.querySelector("cellinput").style.display = "inline";
            cellNode.querySelector("cellinput").offsetHeight;
            editor.refresh()
            cellNode.querySelector("cellinput").style.display = null

            cellNode.classList.remove("codediffers")
        } else if (oldVal == code) {
            cellNode.classList.remove("codediffers")
        }

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

        newCellNode.querySelector(".codefoldcell").onclick = (e) => {
            var newFolded = newCellNode.classList.contains("code-folded")
            if (!newCellNode.querySelector("celloutput").innerHTML || newCellNode.querySelector("celloutput").innerHTML === "<pre><code></code></pre>") {
                // You may not fold code if the output is empty (it would be confusing)
                newFolded = false
            } else {
                newFolded = !newFolded
            }
            requestCodeFoldRemoteCell(uuid, newFolded)
        }

        newCellNode.querySelector(".addcell.before").onclick = (e) => {
            requestNewRemoteCell(indexOfLocalCell(newCellNode))
        }
        newCellNode.querySelector(".addcell.after").onclick = (e) => {
            requestNewRemoteCell(indexOfLocalCell(newCellNode) + 1)
        }
        newCellNode.querySelector(".deletecell").onclick = (e) => {
            if (Object.keys(localCells).length <= 1) {
                requestNewRemoteCell(0)
            }
            requestDeleteRemoteCell(newCellNode.id)
        }
        newCellNode.querySelector(".runcell").onclick = (e) => {
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
        refreshAllCompletionPromise()
        window.localCells[uuid].classList.add("running")
        newCode = window.codeMirrors[uuid].getValue()

        return client.send("changecell", { code: newCode }, uuid, createPromise)
    }

    function requestRunAllRemoteCells(setInputs = true) {
        if (!window.allCellsCompleted) {
            return
        }
        refreshAllCompletionPromise()
        const promises = []

        for (var uuid in window.localCells) {
            const cellNode = window.localCells[uuid]
            cellNode.classList.add("running")
            if (setInputs) {
                promises.push(
                    client.sendreceive("setinput", {
                        code: window.codeMirrors[uuid].getValue()
                    }, uuid).then(u => {
                        updateLocalCellInput(true, cellNode, u.message.code, u.message.folded)
                    })
                )
            }
        }
        Promise.all(promises).then(() => {
            client.send("runall", {})
        }).catch(console.error)
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
        const runAll = client.plutoCONFIG["PLUTO_RUN_NOTEBOOK_ON_LOAD"] == "true"
        // on socket success
        client.send("getallnotebooks", {})

        client.sendreceive("getallcells", {}).then(update => {
            const promises = []

            update.message.cells.forEach((cell, index) => {
                const cellNode = createLocalCell(index, cell.uuid, "", false)
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
                    requestRunAllRemoteCells(false)
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
    client.notebookID = notebookID
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

    /* ERROR HINTS */

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

    window.errorHint = (e) => {
        const cellNode = e.target.parentElement.parentElement.parentElement.parentElement
        wrapInBlock(window.codeMirrors[cellNode.id], "begin")
        requestChangeRemoteCell(cellNode.id)
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
                    if (notebookPath != "unknown") {
                        document.location.href = "open?path=" + encodeURIComponent(notebookPath)
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
        const firstUnsaved = document.querySelector("notebook>cell.codediffers")
        if (firstUnsaved) {
            window.codeMirrors[firstUnsaved.id].focus()
            event.preventDefault();
            event.returnValue = '';
        }
    });
});

