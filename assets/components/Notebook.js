import { html, Component } from "https://unpkg.com/htm/preact/standalone.module.js"

export class Notebook extends Component {
    constructor() {
        super()

        this.state = {
            localCells: [],
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

if (uuid in localCells) {
    console.warn("Tried to add cell with existing UUID. Canceled.")
    console.log(uuid)
    console.log(localCells)
    return localCells[uuid]
}
