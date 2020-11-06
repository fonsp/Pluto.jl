import { html, render } from "./imports/Preact.js"
import "./common/NodejsCompatibilityPolyfill.js"

import { Welcome } from "./components/Welcome.js"

render(html`<${Welcome} />`, document.querySelector("main"))
