import { html, render } from "./common/Preact.js"
import "./common/NodejsCompatibilityPolyfill.js"

import { Editor } from "./components/Editor.js"

// it's like a Rube Goldberg machine
render(html`<${Editor} />`, document.body)
