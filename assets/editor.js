import { Editor, html } from "./components/Editor.js"
import { render } from "https://unpkg.com/preact@10.4.4?module"
import "./common/Polyfill.js"
import "./common/GlobalShortKeys.js"

render(html`<${Editor} />`, document.body)

// TODO:
// if ("fonts" in document) {
//     document.fonts.ready.then(function () {
//         console.log("fonts loaded")
//         for (let cell_id in codeMirrors) {
//             codeMirrors[cell_id].refresh()
//         }
//     })
// }