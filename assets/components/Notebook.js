import { html, Component } from "https://unpkg.com/htm/preact/standalone.module.js"
import { Cell, emptyCellData } from "./Cell.js"
import { PlutoConnection } from "../common/PlutoConnection.js"
import { DropRuler } from "./DropRuler.js"

export class Notebook extends Component {
    constructor() {
        super()

        this.state = {
            localCellData: [],
        }

        this.remote = null
    }

    componentDidMount() {
        this.remote = new NotebookRemote(this.props.client, this)
        // add me _before_ intializing client - it also attaches a listener to beforeunload
        window.addEventListener("beforeunload", (event) => {
            // TODO: dit mag vast niet meer
            const firstUnsaved = document.querySelector("notebook>cell.code-differs")
            if (firstUnsaved) {
                console.log("preventing unload")
                codeMirrors[firstUnsaved.id].focus()
                event.stopImmediatePropagation()
                event.preventDefault()
                event.returnValue = ""
            }
        })

        this.props.client.onUpdate = this.onUpdate.bind(this)
        this.props.client.onEstablishConnection = this.onEstablishConnection.bind(this)
        this.props.client.onReconnect = this.onReconnect.bind(this)
        this.props.client.onDisconnect = this.onDisconnect.bind(this)

        this.props.client.notebookID = this.props.notebookID
        this.props.client.initialize()
    }
    componentDidUpdate() {
        const anyCodeDiffers = this.state.localCellData.any((cell) => cell.codeDiffers)
        // TODO: meer react meer leuk
        document.body.classList.toggle("code-differs", anyCodeDiffers)
    }
    render() {
        return html`
            <notebook>
                ${this.state.localCellData.map(
                    (d) => html`<${Cell}
                        ...${d}
                        key=${d.cellID}
                        client=${this.props.client}
                        remote=${this.remote}
                        createfocus=${false}
                        onUpdateDocQuery=${this.props.onUpdateDocQuery}
                        onCodeDiffersUpdate=${(x) => this.setCellState(d.cellID, { codeDiffers: x })}
                    />`
                )}
            </notebook>
            <${DropRuler} remote=${this.remote} />
        `
    }

    /* SERVER CONNECTION */

    cellById(cellID) {
        return this.state.localCellData.find((c) => c.cellID == cellID)
    }

    setCellState(oldID, newStateProps) {
        // callback to ensure that things work synchronously
        this.setState((prevstate) => {
            return {
                localCellData: prevstate.localCellData.map((c) => {
                    return c.cellID == oldID ? { ...c, ...newStateProps } : c
                }),
            }
        })
        // this.setState({
        //     localCellData: this.state.localCellData.map((c) => {
        //         return c === oldCell ? { ...c, ...newStateProps } : c
        //     }),
        // })
    }

    // these are update message that are _not_ a response to a `sendreceive`
    onUpdate(update, byMe) {
        const message = update.message

        switch (update.type) {
            case "cell_output":
                this.updateLocalCellOutput(this.cellById(update.cellID), message)
                break
            case "cell_running":
                this.setCellState(update.cellID, {
                    running: true,
                })
                break
            case "cell_folded":
                this.setCellState(update.cellID, {
                    codeFolded: message.folded,
                })
                break
            case "cell_input":
                this.updateLocalCellInput(this.cellById(update.cellID), byMe, message.code, message.folded)
                break
            case "cell_deleted":
                this.deleteLocalCell(this.cellById(update.cellID))
                break
            case "cell_moved":
                this.moveLocalCell(this.cellById(update.cellID), message.index)
                break
            case "cell_added":
                const newCell = emptyCellData(update.cellID)
                newCell.running = false
                newCell.output.body = ""
                this.addLocalCell(newCell, message.index, true)
                break
            case "notebook_list":
                // TODO: Editor.js can sendreceive this information themself
                // but this requires sendreceive to queue messages until it has connected
                this.props.onUpdateRemoteNotebooks(message.notebooks)
                break
            case "eval":
                new Function(update.message.script)()
                break
            case "bond_update":
                // TODO
                break
            default:
                console.error("Received unknown update type!")
                console.log(update)
                alert("Something went wrong 🙈\n Try clearing your browser cache and refreshing the page")
                break
        }
    }

    onEstablishConnection() {
        const runAll = this.props.client.plutoENV["PLUTO_RUN_NOTEBOOK_ON_LOAD"] == "true"
        // on socket success
        this.props.client.send("getallnotebooks", {})

        this.props.client
            .sendreceive("getallcells", {})
            .then((update) => {
                this.setState(
                    {
                        localCellData: update.message.cells.map((cell) => {
                            const cellData = emptyCellData(cell.cellID)
                            cellData.running = runAll
                            return cellData
                        }),
                    },
                    () => {
                        const promises = []
                        this.state.localCellData.forEach((cellData) => {
                            promises.push(
                                this.props.client.sendreceive("getinput", {}, cellData.cellID).then((u) => {
                                    this.updateLocalCellInput(cellData, false, u.message.code, u.message.folded)
                                })
                            )
                            promises.push(
                                this.props.client.sendreceive("getoutput", {}, cellData.cellID).then((u) => {
                                    if (!runAll || cellData.running) {
                                        this.updateLocalCellOutput(cellData, u.message)
                                    } else {
                                        // the cell completed running asynchronously, after Pluto received and processed the :getouput request, but before this message was added to this client's queue.
                                    }
                                })
                            )
                        })

                        Promise.all(promises).then(() => {
                            // TODO: more reacty
                            document.body.classList.remove("loading")
                            console.info("Workspace initialized")
                        })
                    }
                )
            })
            .catch(console.error)

        this.props.client.fetchPlutoVersions().then((versions) => {
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

        // TODO
        // updateDocQuery()
    }

    onReconnect() {
        document.body.classList.remove("disconnected")
        document.querySelector("meta[name=theme-color]").content = "#fff"
        for (let cellID in codeMirrors) {
            codeMirrors[cellID].options.disableInput = false
        }
    }

    onDisconnect() {
        document.body.classList.add("disconnected")
        document.querySelector("meta[name=theme-color]").content = "#DEAF91"
        setTimeout(() => {
            if (!this.props.client.currentlyConnected) {
                for (let cellID in codeMirrors) {
                    codeMirrors[cellID].options.disableInput = true
                }
            }
        }, 5000)
    }

    /* NOTEBOOK MODIFIERS */

    addLocalCell(cell, newIndex, focus = true) {
        if (this.state.localCellData.any((c) => c.cellID == cell.cellID)) {
            console.warn("Tried to add cell with existing cellID. Canceled.")
            console.log(cell)
            console.log(this.state.localCellData)
            return
        }

        const before = this.state.localCellData
        this.setState({
            localCellData: [...before.slice(0, newIndex), cell, ...before.slice(newIndex)],
        })
    }

    updateLocalCellOutput(cell, msg) {
        // TODO:
        // statistics.numRuns++

        // TODO:
        // const oldHeight = outputNode.scrollHeight
        // const oldScroll = window.scrollY
        this.setCellState(cell.cellID, msg)

        // TODO
        // (see bond.js)
        // document.dispatchEvent(new CustomEvent("celloutputchanged", { detail: { cell: cellNode, mime: msg.mime } }))

        // if (!allCellsCompleted && !notebookNode.querySelector(":scope > cell.running")) {
        //     allCellsCompleted = true
        //     allCellsCompletedPromise.resolver()
        // }

        // TODO
        // // Scroll the page to compensate for changes in page height:
        // const newHeight = outputNode.scrollHeight
        // const newScroll = window.scrollY

        // if (notebookNode.querySelector("cell:focus-within")) {
        //     const cellsAfterFocused = notebookNode.querySelectorAll("cell:focus-within ~ cell")
        //     if (cellsAfterFocused.length == 0 || !Array.from(cellsAfterFocused).includes(cellNode)) {
        //         window.scrollTo(window.scrollX, oldScroll + (newHeight - oldHeight))
        //     }
        // }
    }

    updateLocalCellInput(cell, byMe, code, folded) {
        // TODO:

        // const cm = codeMirrors[cellNode.id]
        // cellNode.remoteCode = code
        // const oldVal = cm.getValue()
        // // We don't want to update the cell's input if we sent the update.
        // // This might be annoying if you change the cell after the submission,
        // // while the request is still running. This also prevents the codemirror cursor
        // // position from jumping back to (0,0).
        // if (oldVal == "" || !byMe) {
        //     cm.setValue(code)

        //     // Silly code to make codemirror visible, then refresh, then make invisible again (if the code was hidden)
        //     const inputNode = cellNode.querySelector("cellinput")
        //     inputNode.style.display = "inline"
        //     inputNode.offsetTop
        //     cm.refresh()
        //     inputNode.style.display = null

        //     cellNode.classList.remove("code-differs")
        // } else if (oldVal == code) {
        //     cellNode.classList.remove("code-differs")
        // }

        this.setCellState(cell.cellID, {
            remoteCode: {
                body: code,
                submittedByMe: byMe,
            },
            codeFolded: folded,
        })
    }

    deleteLocalCell(cell) {
        // TODO: event listeners? gc?
        this.setState({
            localCellData: this.state.localCellData.filter((c) => c !== cell),
        })
    }

    moveLocalCell(cell, newIndex) {
        const oldIndex = this.state.localCellData.findIndex(c => c === cell)
        if(newIndex > oldIndex) {
            newIndex--
        }
        const without = this.state.localCellData.filter((c) => c !== cell)
        this.setState({
            localCellData: [...without.slice(0, newIndex), cell, ...without.slice(newIndex)],
        })
    }

    /* REQUEST FUNCTIONS */
}

class NotebookRemote {
    constructor(client, notebook) {
        this.client = client
        this.notebook = notebook
    }

    requestChangeRemoteCell(cellID, newCode, createPromise = false) {
        // TODO
        // statistics.numEvals++

        // TODO
        // refreshAllCompletionPromise()

        this.notebook.setCellState(cellID, { running: true })

        return this.client.send("changecell", { code: newCode }, cellID, createPromise)
    }

    // TODO:
    // requestRunAllChangedRemoteCells() {
    //     // TODO
    //     // refreshAllCompletionPromise()

    //     const changed = this.notebook.state.localCellData.filter(c => c.codeDiffers)
    //     const promises = changed.map((cell) => {
    //         this.notebook.setCellState(cell.cellID, {running: true})
    //         return this.client
    //             .sendreceive(
    //                 "setinput",
    //                 {
    //                     code: codeMirrors[cellID].getValue(),
    //                 },
    //                 cellID
    //             )
    //             .then((u) => {
    //                 updateLocalCellInput(true, cellNode, u.message.code, u.message.folded)
    //             })
    //     })
    //     Promise.all(promises)
    //         .then(() => {
    //             this.client.send("runmultiple", {
    //                 cells: changed.map((c) => c.id),
    //             })
    //         })
    //         .catch(console.error)
    // }

    requestInterruptRemote() {
        this.client.send("interruptall", {})
    }

    // Indexing works as if a new cell is added.
    // e.g. if the third cell (at js-index 2) of [0, 1, 2, 3, 4]
    // is moved to the end, that would be new js-index = 5
    requestMoveRemoteCell(cellID, newIndex) {
        this.client.send("movecell", { index: newIndex }, cellID)
    }

    requestNewRemoteCell(cellID, beforeOrAfter) {
        const index = this.notebook.state.localCellData.findIndex((c) => c.cellID == cellID)
        const delta = beforeOrAfter == "before" ? 0 : 1
        this.client.send("addcell", { index: index + delta })
    }

    requestDeleteRemoteCell(cellID) {
        if (false /* TODO: if i am the last cell */) {
            requestNewRemoteCell(cellID, "after")
        }

        this.notebook.setCellState(cellID, {
            running: true,
            remoteCode: {
                body: "",
                submittedByMe: false,
            },
        })
        this.client.send("deletecell", {}, cellID)
    }

    requestCodeFoldRemoteCell(cellID, newFolded) {
        this.client.send("foldcell", { folded: newFolded }, cellID)
    }
}

// if (cellID in localCells) {
//     console.warn("Tried to add cell with existing cellID. Canceled.")
//     console.log(cellID)
//     console.log(localCells)
//     return localCells[cellID]
// }
