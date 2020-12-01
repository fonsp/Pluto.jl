import { html, render, Component } from "./imports/Preact.js"
import "./common/NodejsCompatibilityPolyfill.js"

import { Editor } from "./components/Editor.js"

class ErrorBoundary extends Component {
    constructor() {
        super()
        this.state = {
            error: null,
        }
    }
    componentDidCatch(error, more) {
        console.log(`error:`, error)
        console.log(`more:`, more)
        this.setState({ error })
    }
    render() {
        if (this.state.error) {
            return html` <div>${this.state.error.message}</div> `
        } else {
            return this.props.children
        }
    }
}

// it's like a Rube Goldberg machine
render(html`<${ErrorBoundary}><${Editor} /></${ErrorBoundary}>`, document.body)
