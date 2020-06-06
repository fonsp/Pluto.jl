import { html, Component } from "https://unpkg.com/htm/preact/standalone.module.js"
import { CellOutput } from "./CellOutput.js"
import { CellInput } from "./CellOutput.js"
import { RunArea } from "./RunArea.js"
import { requestChangeRemoteCell, requestDeleteRemoteCell, requestNewRemoteCell, requestCodeFoldRemoteCell, requestInterruptRemote } from "./Editor.js"

export class Cell extends Component {
    constructor() {
        super()
        this.state = {
            codeDiffers: false,
        }
    }
    render() {
        return html`
            <cell>
                <cellshoulder draggable="true" title="Drag to move cell">
                    <button
                        onClick=${() => {
                            requestCodeFoldRemoteCell(this.cellId, this.props.codeFolded)
                        }}
                        class="foldcode"
                        title="Show/hide code"
                    >
                        <span></span>
                    </button>
                </cellshoulder>
                <trafficlight></trafficlight>
                <button
                    onClick=${() => {
                        requestNewRemoteCell(this.props.cellId, "before")
                    }}
                    class="addcell before"
                    title="Add cell"
                >
                    <span></span>
                </button>
                <${CellOutput} output=${this.props.output} mime=${this.props.mime} errored=${this.props.errored} cellId=${this.props.cellId} />
                <${CellInput}
					remoteCode=${this.props.input}
					createFocus=${this.props.createFocus}
                    onChange=${() => {
                        requestChangeRemoteCell(this.props.cellId)
                    }}
                    onDelete=${() => {
						if (I AM THE LAST CELL) {
							requestNewRemoteCell(this.props.cellId, "after")
						}
                        requestDeleteRemoteCell(this.props.cellId)
                    }}
                    onCodeDiffersUpdate=${(x) => this.setState({ codeDiffers: x })}
                    onUpdateDocQuery=${this.props.onUpdateDocQuery}
                />
                <${RunArea} onClick=${() => {
					if (this.props.running) {
						newCellNode.classList.add("error")
						requestInterruptRemote()
					} else {
						requestChangeRemoteCell(this.props.cellId)
					}
				}} runtime=${this.props.runtime} />
                <button
                    onClick=${() => {
                        requestNewRemoteCell(this.props.cellId, "after")
                    }}
                    class="addcell after"
                    title="Add cell"
                >
                    <span></span>
                </button>
            </cell>
        `
	}
}