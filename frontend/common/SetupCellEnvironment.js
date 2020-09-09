// import Library from "https://unpkg.com/@observablehq/stdlib@3.3.1/src/library.js?module"

// make observablehq stdlib available to JS code inside cells, by setting window.DOM, window.html, etc
window.observablehq.Library()
const observablehq = window.observablehq

window.DOM = observablehq.DOM
window.Files = observablehq.Files
window.Generators = observablehq.Generators
window.Promises = observablehq.Promises
window.now = observablehq.now
window.svg = observablehq.svg()
window.html = observablehq.html()
window.require = observablehq.require()

// TODO
// observablehq.md and observablehq.tex will call d3-require, which will create a conflict if something else is using d3-require
// in particular, plotly.js will break

// observablehq.md(observablehq.require()).then((md) => (observablehq_exports.md = md))
// observablehq.tex().then(tex => observablehq_exports.tex = tex)

export { observablehq as default }
