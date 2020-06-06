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
                        remoteValue=${this.state.path}
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
                <${Notebook}
                    notebookID=${this.state.notebookID}
                    onUpdateRemoteNotebooks=${this.updateRemoteNotebooks.bind(this)}
                    onUpdateDocQuery=${(query) => this.setState({ desiredDocQuery: query })}
                    client=${this.client}
                />
                <dropruler></dropruler>
            </main>
            <${LiveDocs} desiredQuery=${this.state.desiredDocQuery} client=${this.client} />
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
        const oldPath = this.state.path
        const newPath = window.filePickerCodeMirror.getValue()
        if (oldPath == newPath) {
            return
        }
        if (confirm("Are you sure? Will move from\n\n" + oldPath + "\n\nto\n\n" + newPath)) {
            document.body.classList.add("loading")
            this.client
                .sendreceive("movenotebookfile", {
                    path: newPath,
                })
                .then((u) => {
                    document.body.classList.remove("loading")

                    if (u.message.success) {
                        this.setState({
                            path: newPath,
                        })
                        document.activeElement.blur()
                    } else {
                        this.setState({
                            path: oldPath, // TODO: this doesnt set the codemirror value
                        })
                        alert("Failed to move file:\n\n" + u.message.reason)
                    }
                })
        } else {
            this.setState({
                path: oldPath, // TODO: this doesnt set the codemirror value
            })
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

/* LOCALSTORAGE NOTEBOOKS LIST */

export function updateStoredRecentNotebooks(recentPath, alsodelete = undefined) {
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
