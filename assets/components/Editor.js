import { html, Component, render } from "https://unpkg.com/htm/preact/standalone.module.js"
import { FilePicker } from "./FilePicker.js"
import { Notebook } from "./Notebook.js"
import { LiveDocs } from "./LiveDocs.js"
import { PlutoConnection } from "../common/PlutoConnection.js"

export class Editor extends Component {
    constructor() {
        super()

        this.state = {
            path: "unknown",
            notebookID: document.location.search.split("id=")[1],
            localCells: [],
            desiredDocQuery: "nothing yet",
        }

        this.remoteNotebookList = []

        this.client = new PlutoConnection() // will be initialized by Notebook
    }

    render() {
        const fileName = this.state.path.split("/").pop().split("\\").pop()
        const cuteName = "🎈 " + fileName + " ⚡ Pluto.jl ⚡"
        document.title = cuteName

        return html`
            <header>
                <div id="logocontainer">
                    <a href="./">
                        <h1><img id="logo-big" src="assets/img/logo.svg" alt="Pluto.jl" /><img id="logo-small" src="assets/img/favicon_unsaturated.svg" /></h1>
                    </a>
                    <${FilePicker}
                        client=${this.client}
                        initialValue=${this.state.path}
                        onEnter=${this.submitFileChange}
                        onReset=${() => updateLocalNotebookPath(notebook.path)}
                        onBlur=${() => updateLocalNotebookPath(notebook.path)}
                        suggestNewFile=${true}
                    />
                </div>
            </header>
            <main>
                <preamble>
                    <button onClick=${this.requestRunAllChangedRemoteCells} class="runallchanged" title="Save and run all changed cells"><span></span></button>
                </preamble>
                <${Notebook} notebookID=${this.state.notebookID} onUpdateRemoteNotebooks=${this.updateRemoteNotebooks.bind(this)} onUpdateDocQuery=${query => this.setState({desiredDocQuery: query})} client=${this.client} />
                <dropruler></dropruler>
            </main>
            <${LiveDocs} desiredQuery=${this.state.desiredDocQuery} client=${this.client}/>
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

    updateRemoteNotebooks(list) {
        const oldPath = this.state.path

        this.remoteNotebookList = list
        list.forEach((nb) => {
            if (nb.notebookID == this.state.notebookID) {
                this.setState(nb)
            }
        })

        updateStoredRecentNotebooks(this.state.path, oldPath)
    }
}

export function requestChangeRemoteCell(newCode, cellID, createPromise = false) {
    statistics.numEvals++

    refreshAllCompletionPromise()
    localCells[cellID].classList.add("running")

    return client.send("changecell", { code: newCode }, cellID, createPromise)
}

export function requestRunAllChangedRemoteCells() {
    refreshAllCompletionPromise()

    const changed = Array.from(notebookNode.querySelectorAll("cell.code-differs"))
    const promises = changed.map((cellNode) => {
        const cellID = cellNode.id
        cellNode.classList.add("running")
        return client
            .sendreceive(
                "setinput",
                {
                    code: codeMirrors[cellID].getValue(),
                },
                cellID
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
export function requestMoveRemoteCell(cellID, newIndex) {
    client.send("movecell", { index: newIndex }, cellID)
}

export function requestNewRemoteCell(newIndex) {
    client.send("addcell", { index: newIndex })
}

export function requestDeleteRemoteCell(cellID) {
    localCells[cellID].classList.add("running")
    codeMirrors[cellID].setValue("")
    client.send("deletecell", {}, cellID)
}

export function requestCodeFoldRemoteCell(cellID, newFolded) {
    client.send("foldcell", { folded: newFolded }, cellID)
}



/* LOCALSTORAGE NOTEBOOKS LIST */

export function updateStoredRecentNotebooks(recentPath, alsodelete=undefined) {
    const storedString = localStorage.getItem("recent notebooks")
    const storedList = !!storedString ? JSON.parse(storedString) : []
    const oldpaths = storedList
    const newpaths = [recentPath].concat(
        oldpaths.filter((path) => {
            return path != recentPath && path != alsodelete
        })
    )
    localStorage.setItem("recent notebooks", JSON.stringify(newpaths.slice(0, 50)))
}