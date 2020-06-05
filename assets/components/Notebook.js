import { html, Component } from "https://unpkg.com/htm/preact/standalone.module.js"

export class Notebook extends Component {
    constructor() {
        super()

        this.state = {
            path: "unknown",
            uuid: document.location.search.split("uuid=")[1],
            localCells: [],
            remoteNotebookList: [],
        }
    }
    render() {
        return html`
            <notebook>
                ${this.state.localCells}
            </notebook>
        `
    }
}
