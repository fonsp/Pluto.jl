import { html, render } from "./imports/Preact.js"
import "./common/NodejsCompatibilityPolyfill.js"

import { Welcome } from "./components/welcome/Welcome.js"

render(html`<${Welcome} />`, document.querySelector("#app"))
