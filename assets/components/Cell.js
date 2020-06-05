import { html, Component } from "https://unpkg.com/htm/preact/standalone.module.js"

export class CellInput extends Component {
    componentDidMount() {
        this.base.innerHTML = this.props.body
    }
    render() {
        return html`
			<filepicker>
                <button>Rename</button>
            </filepicker>
        `
    }
}

export class Cell extends Component {
    render() {
        return html`
            <cell>
                <cellshoulder draggable="true" title="Drag to move cell">
                    <button class="foldcode" title="Show/hide code"><span></span></button>
                </cellshoulder>
                <trafficlight></trafficlight>
                <button class="addcell before" title="Add cell"><span></span></button>
                <celloutput tabindex="1">
                    <assignee></assignee>
                    <div></div>
                </celloutput>
                <cellinput>
                    <button class="deletecell" title="Delete cell"><span></span></button>
                </cellinput>
                <runarea>
                    <span clas="runtime">---</span>
                    <button class="runcell" title="Run"><span></span></button>
                </runarea>
                <button class="addcell after" title="Add cell"><span></span></button>
            </cell>
        `
    }
}
