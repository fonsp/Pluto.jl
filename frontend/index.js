import { html } from "./common/Html.js"
import { render } from "https://unpkg.com/preact@10.4.4?module"

import { Welcome } from "./components/Welcome.js"

render(html`<${Welcome} />`, document.querySelector("main"))
