import { html, Component } from "https://unpkg.com/htm/preact/standalone.module.js"
import { CellOutput } from "./CellOutput.js"
import { CellInput } from "./CellInput.js"
import { RunArea } from "./RunArea.js"
import { cl } from "../common/ClassTable.js"

export function emptyCellData(cellID) {
    return {
        cellID: cellID,
        remoteCode: {
			body: "",
			submittedByMe: false,
		},
		codeFolded: false,
		codeDiffers: false,
        running: true,
        runtime: null,
		errored: false,
        output: {
            body: null,
            mime: "text/plain",
            rootassignee: null,
        },
    }
}

export class Cell extends Component {
    render({ cellID, remoteCode, codeFolded, codeDiffers, running, runtime, errored, output }) {
        return html`
            <cell
                class=${cl({
                    running: running,
                    "output-notinsync": output.body == null,
                    "has-assignee": !output.errored && output.rootassignee != null,
                    "inline-output": !output.errored && !!output.body && (output.mime == "application/vnd.pluto.tree+xml" || output.mime == "text/plain"),
					error: errored,
					"code-differs": codeDiffers,
					"code-folded": codeFolded,
                })}
				id=${cellID}
            >
                <cellshoulder draggable="true" title="Drag to move cell">
                    <button
                        onClick=${() => {
                            this.props.remote.requestCodeFoldRemoteCell(cellID, !codeFolded)
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
                        this.props.remote.requestNewRemoteCell(cellID, "before")
                    }}
                    class="addcell before"
                    title="Add cell"
                >
                    <span></span>
                </button>
                <${CellOutput} ...${output} cellID=${cellID} />
                <${CellInput}
					...${remoteCode}
                    createFocus=${this.props.createFocus}
                    onSubmitChange=${(newCode) => {
                        this.props.remote.requestChangeRemoteCell(cellID, newCode)
                    }}
                    onDelete=${() => {
                        this.props.remote.requestDeleteRemoteCell(cellID)
                    }}
                    codeDiffers=${codeDiffers}
                    onCodeDiffersUpdate=${this.props.onCodeDiffersUpdate}
                    onUpdateDocQuery=${this.props.onUpdateDocQuery}
                />
                <${RunArea}
                    onClick=${() => {
                        if (running) {
                            newCellNode.classList.add("error")
                            this.props.remote.requestInterruptRemote()
                        } else {
                            this.props.remote.requestChangeRemoteCell(cellID)
                        }
                    }}
                    runtime=${runtime}
                />
                <button
                    onClick=${() => {
                        this.props.remote.requestNewRemoteCell(cellID, "after")
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