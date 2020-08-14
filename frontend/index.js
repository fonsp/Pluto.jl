import { html, render } from "./common/Preact.js"

import { Welcome } from "./components/Welcome.js"

render(html`<${Welcome} />`, document.querySelector("main"))
