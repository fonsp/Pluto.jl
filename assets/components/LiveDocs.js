import { html, Component, render } from "https://unpkg.com/htm/preact/standalone.module.js"
import { RawHTMLContainer } from "./CellOutput.js"
import { cl } from "../common/ClassTable.js"

export class LiveDocs extends Component {
    constructor() {
        super()
        this.state = {
            query: "nothing yet",
            body: "Start typing code to learn more!",
            hidden: true,
            loading: false,
        }
        this.updateDocTimer = undefined
    }

    componentDidUpdate() {
        if (this.state.hidden) {
            return
        }
        let newQuery = this.props.desiredDocQuery
        if (!/[^\s]/.test(newQuery)) {
            // only whitespace
            return
        }

        if (query == undefined) {
            query = window.desiredDocQuery
        }
        if (query == displayedDocQuery) {
            return
        }

        window.desiredDocQuery = query

        if (doc.classList.contains("loading")) {
            updateDocTimer = setTimeout(() => {
                updateDocQuery()
            }, 1000)
            return
        }

        doc.classList.add("loading")
        client.sendreceive("docs", { query: query }).then((u) => {
            if (u.message.status == "⌛") {
                updateDocTimer = setTimeout(() => {
                    doc.classList.remove("loading")
                    updateDocQuery()
                }, 1000)
                return
            }
            doc.classList.remove("loading")
            window.displayedDocQuery = query
            if (u.message.status == "👍") {
                this.setState({
                    query: query,
                    body: u.message.doc,
                })
            }
        })
    }

    render() {
        return html`
            <div id="helpbox-wrapper" class=${cl({ hidden: this.state.hidden })}>
                <helpbox class="hidden">
                    <header onClick=${() => this.setState({ hidden: !this.state.hidden })}>${this.state.hidden ? "Live docs" : this.state.query}</header>
                    <section>
                        <p>Searching for ${this.props.desiredQuery}</p>
                        <${RawHTMLContainer} body=${this.state.body} />
                    </section>
                </helpbox>
            </div>
        `
    }

    updateDocQuery() {}
}
