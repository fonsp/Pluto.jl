// import Library from "https://unpkg.com/@observablehq/stdlib@3.3.1/src/library.js?module"

// make observablehq stdlib available to JS code inside cells, by setting window.DOM, window.html, etc
window.observablehq.Library()
const observablehq = window.observablehq

//Object.assign(window, observablehq)
window.DOM = observablehq.DOM
window.Files = observablehq.Files
window.Generators = observablehq.Generators
window.Promises = observablehq.Promises
window.now = observablehq.now
window.svg = observablehq.svg()
observablehq.md().then(md => window.md = md)
// TODO
// observablehq.tex().then(tex => window.tex = tex)
window.html = observablehq.html()
window.require = observablehq.require()

export { observablehq as default }
