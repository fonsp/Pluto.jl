document.addEventListener("DOMContentLoaded", () => {

    /* REMOTE NOTEBOOK LIST */

    notebookID = (new URL(document.location.href)).search.split("uuid=")[1]
    notebookName = notebookID

    function updateLocalNotebookName(newName) {
        notebookName = newName
        document.querySelector("#printernametitle").innerText = newName;

        fileName = newName.split("/").pop().split("\\").pop()
        cuteName = "🎈 " + fileName + " ⚡ Pluto.jl ⚡"
        document.title = cuteName
    }

    window.remoteNotebookList = null

    function updateRemoteNotebooks(list) {
        remoteNotebookList = list
        list.forEach(nb => {
            if (nb.uuid == notebookID) {
                updateLocalNotebookName(nb.path)
            }
        })
        console.log(list)
    }

    /* DOM THINGIES */

    document.querySelector("preamble>button.runall").onclick = (e) => {
        requestRunAllRemoteCells()
    }

    cellTemplate = document.querySelector("#celltemplate").content.firstElementChild
    notebookNode = document.querySelector("notebook")
    window.notebookNode = notebookNode

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
                return "⋅"
            },
            // theme: "paraiso-light",
            viewportMargin: Infinity,
            placeholder: "Enter cell code...",
            indentWithTabs: true,
            indentUnit: 4,
            hintOptions: { hint: juliahints },
        });

        window.codeMirrors[cellNode.id] = editor
        //editor.setOption("readOnly", true);

        editor.setOption("extraKeys", {
            "Ctrl-Enter": () => requestChangeRemoteCell(cellNode.id),
            "Shift-Enter": () => {
                requestNewRemoteCell(indexOfLocalCell(cellNode) + 1)
                requestChangeRemoteCell(cellNode.id)
            },
            "Ctrl-Delete": () => {
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

    function updateLocalCellOutput(cellNode, mime, output, errormessage, runtime) {
        cellNode.classList.remove("running")
        cellNode.querySelector("runarea>span").innerText = prettytime(runtime)

        oldHeight = cellNode.querySelector("celloutput").scrollHeight

        if (errormessage) {
            cellNode.querySelector("celloutput").innerHTML = "<pre><code></code></pre>"
            cellNode.querySelector("celloutput").querySelector("code").innerText = errormessage
            cellNode.classList.add("error")
        } else {
            cellNode.classList.remove("error")
            if (mime == "text/html") {
                // from https://stackoverflow.com/a/26716182

                cellNode.querySelector("celloutput").innerHTML = output

                // to execute all scripts in the output html:
                try {
                    var scripts = Array.prototype.slice.call(cellNode.querySelector("celloutput").getElementsByTagName("script"))
                    for (var i = 0; i < scripts.length; i++) {
                        if (scripts[i].src != "") {
                            if (!Array.prototype.map.call(document.head.querySelectorAll("script"), s => s.src).includes(scripts[i])) {
                                var tag = document.createElement("script")
                                tag.src = scripts[i].src
                                document.head.appendChild(tag)
                            }
                        } else {
                            eval(scripts[i].innerHTML)
                        }
                    }
                } catch (err) {
                    console.log("Couldn't execute all scripts:")
                    console.log(err)
                    // TODO: relay to user
                    // might be wise to wait after adding scripts to head
                    //
                }

                // convert LaTeX to svg
                MathJax.typeset()
            } else {
                cellNode.querySelector("celloutput").innerHTML = "<pre><code></code></pre>"
                cellNode.querySelector("celloutput").querySelector("code").innerText = output
            }
        }

        cellNode.classList.remove("output-notinsync")

        newHeight = cellNode.querySelector("celloutput").scrollHeight

        focusedCell = document.querySelector("cell:focus-within")
        if (focusedCell == cellNode) {
            window.scrollBy(0, newHeight - oldHeight)
        }
    }

    function updateLocalCellInput(byMe, uuid, code) {
        var editor = window.codeMirrors[uuid]
        var cellNode = window.localCells[uuid]
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
    }

    function indexOfLocalCell(cellNode) {
        // .indexOf doesn't work on HTMLCollection
        for (var i = 0; i < notebookNode.children.length; i++) {
            if (notebookNode.children[i].id == cellNode.id) {
                return i
            }
        }
    }

    function createLocalCell(newIndex, uuid, code) {
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
        editor.focus()

        // EVENT LISTENERS FOR CLICKY THINGS

        newCellNode.querySelector("celloutput").onclick = (e) => {
            // Do not fold if the click event was fired because the user selects text in the output.
            if (window.getSelection().isCollapsed) {
                // Do not fold if a link was clicked.
                if (e.target.tagName != "A") {
                    newCellNode.classList.toggle("code-folded")
                    // Force redraw:
                    if (!newCellNode.classList.contains("code-folded")) {
                        editor.refresh()
                    }
                }
            }
            // You may not fold code if the output is empty (it would be confusing)
            if (!newCellNode.querySelector("celloutput").innerHTML || newCellNode.querySelector("celloutput").innerHTML === "<pre><code></code></pre>") {
                newCellNode.classList.remove("code-folded")
            }
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

    function requestChangeRemoteCell(uuid) {
        window.localCells[uuid].classList.add("running")
        newCode = window.codeMirrors[uuid].getValue()

        client.send("changecell", { code: newCode }, uuid)
    }

    function requestRunAllRemoteCells() {
        for (var uuid in window.localCells) {
            window.localCells[uuid].classList.add("running")
        }
        client.send("runall", {})
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


    /* SERVER CONNECTION */

    function onUpdate(update, byMe) {
        var message = update.message

        switch (update.type) {
            case "cell_output":
                updateLocalCellOutput(window.localCells[update.cellID], message.mime, message.output, message.errormessage, message.runtime)
                break
            case "cell_input":
                // TODO: catch exception
                updateLocalCellInput(byMe, update.cellID, message.code)
                break
            case "cell_added":
                createLocalCell(message.index, update.cellID, "")
                break
            case "cell_deleted":
                // TODO: catch exception
                var toDelete = window.localCells[update.cellID]
                deleteLocalCell(toDelete)
                break
            case "cell_moved":
                // TODO: catch exception
                moveLocalCell(window.localCells[update.cellID], message.index)
                break
            case "cell_running":
                // TODO: catch exception
                window.localCells[update.cellID].classList.add("running")
                break
            case "notebook_list":
                // TODO: catch exception
                updateRemoteNotebooks(message.notebooks)
                break
            default:
                console.error("Received unknown update type!")
                console.log(update)
                alert("Something went wrong 🙈\n Try clearing your cache and refreshing the page")
                break
        }
    }

    function onEstablishConnection() {
        // on socket success
        client.send("getallnotebooks", {})

        client.sendreceive("getallcells", {}).then(update => {
            const promises = []

            update.message.cells.forEach((cell, index) => {
                const cellNode = createLocalCell(index, cell.uuid, "")
                promises.push(
                    client.sendreceive("getinput", {}, cell.uuid).then(update => {
                        updateLocalCellInput(true, cell.uuid, update.message.code)
                    })
                )
                promises.push(
                    client.sendreceive("getoutput", {}, cell.uuid).then(update => {
                        const message = update.message
                        updateLocalCellOutput(window.localCells[update.cellID], message.mime, message.output, message.errormessage, message.runtime)
                    })
                )
            })

            Promise.all(promises).then(() => {
                // We do a code completion request to trigger starting the workpsace
                client.sendreceive("complete", {
                    query: "nothinginparticular"
                }).then(() => {
                    document.body.classList.remove("loading")
                    console.info("Workspace initialized")
                })
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

    document.ondragover = (e) => {
        e.preventDefault();
    }

    var dropPositions = []
    var dropee = null
    document.ondragstart = (e) => {
        dropee = e.target.parentElement

        dropPositions = []
        for (var i = 0; i < notebookNode.children.length; i++) {
            dropPositions.push(notebookNode.children[i].offsetTop)
        }
        dropPositions.push(notebookNode.lastChild.offsetTop + notebookNode.lastChild.scrollHeight)
    }
    // Called continuously during drag
    document.ondrag = (e) => {
        dist = dropPositions.map(p => Math.abs(p - e.pageY))
        dropIndex = argmin(dist)

        dropruler.style.top = dropPositions[dropIndex] + "px";
        dropruler.style.display = "block";
        console.log(dropIndex)
    }
    document.ondrop = (e) => {
        dist = dropPositions.map(p => Math.abs(p - e.pageY))
        dropIndex = argmin(dist)

        dropruler.style.display = "none";

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

    /* UNICODE */

    const te = new TextEncoder()
    const td = new TextDecoder()

    function lengthUtf8(str, startindex_utf16 = 0, endindex_utf16 = undefined) {
        return te.encode(str.substring(startindex_utf16, endindex_utf16)).length
    }

    function utf8index_to_ut16index(str, index_utf8) {
        return td.decode(te.encode(str).slice(0, index_utf8)).length
    }

    function spliceUtf8(original, startindex_utf8, endindex_utf8, replacement) {
        // JS uses UTF-16 for internal representation of strings, e.g.
        // "e".length == 1, "é".length == 1, "🐶".length == 2

        // Julia uses UTF-8, e.g.
        // ncodeunits("e") == 1, ncodeunits("é") == 2, ncodeunits("🐶") == 4
        //     length("e") == 1,     length("é") == 1,     length("🐶") == 1

        // Completion results from julia will give the 'splice indices': "where should the completed keyword be inserted?"
        // we need to splice into javascript string, so we convert to a UTF-8 byte array, then splice, then back to the string.

        const original_enc = te.encode(original)
        const replacement_enc = te.encode(replacement)

        const result_enc = new Uint8Array(original_enc.length + replacement_enc.length - (endindex_utf8 - startindex_utf8))

        result_enc.set(
            original_enc.slice(0, startindex_utf8),
            0,
        )
        result_enc.set(
            replacement_enc,
            startindex_utf8,
        )
        result_enc.set(
            original_enc.slice(endindex_utf8),
            startindex_utf8 + replacement_enc.length
        )

        return td.decode(result_enc)
    }

    console.assert(spliceUtf8("e é 🐶 is a dog", 5, 9, "hannes ❤") == "e é hannes ❤ is a dog")

    /* AUTOCOMPLETE */

    const noAutocomplete = " \t\r\n([])+-=/,:;'\"!#$%^&*~`<>|"

    function onTabKey(cm) {
        const cursor = cm.getCursor()
        const oldLine = cm.getLine(cursor.line)

        if(cm.somethingSelected()){
            cm.indentSelection()
        } else if (cursor.ch > 0 && noAutocomplete.indexOf(oldLine[cursor.ch - 1]) == -1) {
            cm.showHint()
        } else {
            cm.replaceSelection('\t')
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

    /* MORE SHORTKEYS */
    document.addEventListener("keydown", (e) => {
        switch (e.keyCode) {
            case 191: // ? or /
                if (!e.ctrlKey) {
                    break
                }
            // fall into:
            case 112: // F1
                // TODO: show help    
                alert("Shortcuts 🎹\n\nCtrl+Enter:   run cell\nShift+Enter:   run cell and add cell below\nCtrl+Delete:   delete cell")

                e.preventDefault()
                break
        }
    })
});

