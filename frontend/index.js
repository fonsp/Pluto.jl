import { html, render } from "./imports/Preact.js"
import "./common/NodejsCompatibilityPolyfill.js"

import { Welcome } from "./components/welcome/Welcome.js"

// @ts-ignore
render(html`<${Welcome} />`, document.querySelector("#app"))
