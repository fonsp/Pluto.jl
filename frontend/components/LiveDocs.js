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
            body: "Start typing in a cell to learn more!",
            hidden: false,
            loading: false,
        }
        this.updateDocTimer = undefined
    }

    componentDidMount() {
        window.addEventListener("open_live_docs", () => {
            // https://github.com/fonsp/Pluto.jl/issues/321
            this.setState({
                hidden: false,
            })
            if (window.getComputedStyle(this.base).display === "none") {
                alert("This browser window is too small to show docs.\n\nMake the window bigger, or try zooming out.")
            }
        })
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
            <aside id="helpbox-wrapper">
                <pluto-helpbox class=${cl({ hidden: this.state.hidden, loading: this.state.loading })}>
                    <header onClick=${() => this.setState({ hidden: !this.state.hidden })}>
                        ${this.state.hidden || this.state.searched_query == null ? "Live docs" : this.state.searched_query}
                    </header>
                    <section>
                        <h1><code>${this.state.shown_query}</code></h1>
                        <${RawHTMLContainer}
                            body=${this.state.body}
                            pure=${true}
                            on_render=${(n) => resolve_doc_reference_links(n, this.props.on_update_doc_query)}
                        />
                    </section>
                </pluto-helpbox>
            </aside>
        `
    }
}

const resolve_doc_reference_links = (node, on_update_doc_query) => {
    const as = node.querySelectorAll("a")
    as.forEach((a) => {
        const href = a.getAttribute("href")
        if (href != null && href.startsWith("@ref")) {
            const query = href.length > 4 ? href.substr(5) : a.textContent
            a.onclick = (e) => {
                on_update_doc_query(query)
                e.preventDefault()
            }
        }
    })
}
