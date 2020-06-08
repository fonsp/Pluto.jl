import { Editor } from "./components/Editor.js"
import { html as preacthtml, render } from "https://unpkg.com/htm/preact/standalone.module.js"
import "./common/Polyfill.js"
import "./common/GlobalShortKeys.js"

render(preacthtml`<${Editor} />`, document.body)

// TODO:
// if ("fonts" in document) {
//     document.fonts.ready.then(function () {
//         console.log("fonts loaded")
//         for (let cell_id in codeMirrors) {
//             codeMirrors[cell_id].refresh()
//         }
//     })
// }