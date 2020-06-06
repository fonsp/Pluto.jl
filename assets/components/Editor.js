import { html, Component, render } from "https://unpkg.com/htm/preact/standalone.module.js"
import { FilePicker } from "./FilePicker.js"

export class Editor extends Component {
    
    constructor() {
        super()

        this.state = {
            path: "unknown",
            uuid: document.location.search.split("uuid=")[1],
            remoteNotebookList: [],
            localCells: [],
        }

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

        window.client = new PlutoConnection(onUpdate, onEstablishConnection, onReconnect, onDisconnect)
        client.notebookID = this.state.uuid
        client.initialize()
    }

    render() {
        return html`
            <header>
                <div id="logocontainer">
                    <a href="./">
                        <h1>
                            <img id="logo-big" src="assets/img/logo.svg" alt="Pluto.jl" /><img
                                id="logo-small"
                                src="assets/img/favicon_unsaturated.svg"
                                alt=""
                            />
                        </h1>
                    </a>
                    <${FilePicker}
                        onEnter=${this.submitFileChange}
                        onReset=${() => updateLocalNotebookPath(notebook.path)}
                        onBlur=${(cm, e) => {
                            // if the user clicks on an autocomplete option, this event is called, even though focus was not actually lost.
                            // debounce:
                            setTimeout(() => {
                                if (!cm.hasFocus()) {
                                    updateLocalNotebookPath(notebook.path)
                                }
                            }, 250)
                        }}
                        suggestNewFile=${true}
                    />
                </div>
            </header>
            <main>
                <preamble>
                    <button onClick=${this.requestRunAllChangedRemoteCells} class="runallchanged" title="Save and run all changed cells"><span></span></button>
                </preamble>
                <${Notebook} id=${this.state.uuid}/>
                <dropruler></dropruler>
            </main>
            <div id="helpbox-wrapper">
                <helpbox class="hidden">
                    <header></header>
                    <section></section>
                </helpbox>
            </div>
            <footer>
                <div id="info">
                    <form id="feedback" action="#" method="post">
                        <a id="statistics-info" href="statistics-info">Statistics</a>
                        <label for="opinion">🙋 How can we make <a href="https://github.com/fonsp/Pluto.jl">Pluto.jl</a> better?</label>
                        <input type="text" name="opinion" id="opinion" autocomplete="off" placeholder="Instant feedback..." />
                        <button>Send</button>
                    </form>
                </div>
            </footer>
        `
    }

    /* FILE PICKER */

    submitFileChange() {
        const oldPath = notebook.path
        const newPath = window.filePickerCodeMirror.getValue()
        if (oldPath == newPath) {
            return
        }
        if (confirm("Are you sure? Will move from\n\n" + oldPath + "\n\nto\n\n" + newPath)) {
            document.body.classList.add("loading")
            client
                .sendreceive("movenotebookfile", {
                    path: newPath,
                })
                .then((u) => {
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
}



export function requestChangeRemoteCell(newCode, uuid, createPromise = false) {
    statistics.numEvals++

    refreshAllCompletionPromise()
    localCells[uuid].classList.add("running")

    return client.send("changecell", { code: newCode }, uuid, createPromise)
}

export function requestRunAllChangedRemoteCells() {
    refreshAllCompletionPromise()

    const changed = Array.from(notebookNode.querySelectorAll("cell.code-differs"))
    const promises = changed.map((cellNode) => {
        const uuid = cellNode.id
        cellNode.classList.add("running")
        return client
            .sendreceive(
                "setinput",
                {
                    code: codeMirrors[uuid].getValue(),
                },
                uuid
            )
            .then((u) => {
                updateLocalCellInput(true, cellNode, u.message.code, u.message.folded)
            })
    })
    Promise.all(promises)
        .then(() => {
            client.send("runmultiple", {
                cells: changed.map((c) => c.id),
            })
        })
        .catch(console.error)
}

export function requestInterruptRemote() {
    client.send("interruptall", {})
}

// Indexing works as if a new cell is added.
// e.g. if the third cell (at js-index 2) of [0, 1, 2, 3, 4]
// is moved to the end, that would be new js-index = 5
export function requestMoveRemoteCell(uuid, newIndex) {
    client.send("movecell", { index: newIndex }, uuid)
}

export function requestNewRemoteCell(newIndex) {
    client.send("addcell", { index: newIndex })
}

export function requestDeleteRemoteCell(uuid) {
    localCells[uuid].classList.add("running")
    codeMirrors[uuid].setValue("")
    client.send("deletecell", {}, uuid)
}

export function requestCodeFoldRemoteCell(uuid, newFolded) {
    client.send("foldcell", { folded: newFolded }, uuid)
}