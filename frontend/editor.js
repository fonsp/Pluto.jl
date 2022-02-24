import { html, render } from "./imports/Preact.js"
import "./common/NodejsCompatibilityPolyfill.js"

import { Editor } from "./components/Editor.js"
import { available as vscode_available } from "./common/VSCodeApi.js"

// remove default stylesheet inserted by VS Code
if (vscode_available) {
    document.head.querySelector("style#_defaultStyles").remove()
}

// it's like a Rube Goldberg machine
render(html`<${Editor} />`, document.body)
