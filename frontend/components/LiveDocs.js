import { html, Component } from "../common/Preact.js"
import observablehq from "../common/SetupCellEnvironment.js"
import { cl } from "../common/ClassTable.js"

import { RawHTMLContainer } from "./CellOutput.js"

export class LiveDocs extends Component {
    constructor() {
        super()
        this.state = {
            shown_query: null,
            searched_query: null,
            body: "Start typing code to learn more!",
            hidden: true,
            loading: false,
        }
        this.updateDocTimer = undefined
    }

    componentDidUpdate() {
        if (this.state.hidden || this.state.loading) {
            return
        }
        if (!/[^\s]/.test(this.props.desired_doc_query)) {
            // only whitespace
            return
        }

        if (this.state.searched_query === this.props.desired_doc_query) {
            return
        }

        this.fetch_docs()
    }

    fetch_docs() {
        const new_query = this.props.desired_doc_query
        this.setState({
            loading: true,
            searched_query: new_query,
        })
        Promise.race([
            observablehq.Promises.delay(2000, false),
            this.props.client.send("docs", { query: new_query }, { notebook_id: this.props.notebook.notebook_id }).then((u) => {
                if (u.message.status === "⌛") {
                    return false
                }
                if (u.message.status === "👍") {
                    this.setState({
                        shown_query: new_query,
                        body: u.message.doc,
                    })
                    return true
                }
            }),
        ]).then(() => {
            this.setState({
                loading: false,
            })
        })
    }

    render() {
        return html`
            <div id="helpbox-wrapper">
                <helpbox class=${cl({ hidden: this.state.hidden, loading: this.state.loading })}>
                    <header onClick=${() => this.setState({ hidden: !this.state.hidden })}>
                        ${this.state.hidden || this.state.searched_query == null ? "Live docs" : this.state.searched_query}
                    </header>
                    <section>
                        <h1><code>${this.state.shown_query}</code></h1>
                        <${RawHTMLContainer} body=${this.state.body} />
                    </section>
                </helpbox>
            </div>
        `
    }
}
