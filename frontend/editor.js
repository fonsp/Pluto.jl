import { html, render } from "./imports/Preact.js"
import "./common/NodejsCompatibilityPolyfill.js"
// as
import { Editor } from "./components/Editor.js"

// it's like a Rube Goldberg machine
render(html`<${Editor} />`, document.body)
