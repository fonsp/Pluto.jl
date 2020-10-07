// import Library from "https://unpkg.com/@observablehq/stdlib@3.3.1/src/library.js?module"

export let make_library = () => {
    let library = new window.observablehq.Library()
    return {
        DOM: library.DOM,
        Files: library.Files,
        Generators: library.Generators,
        Promises: library.Promises,
        now: library.now,
        svg: library.svg(),
        html: library.html(),
        require: library.require(),
    }

    // TODO
    // observablehq.md and observablehq.tex will call d3-require, which will create a conflict if something else is using d3-require
    // in particular, plotly.js will break

    // observablehq.md(observablehq.require()).then((md) => (observablehq_exports.md = md))
    // observablehq.tex().then(tex => observablehq_exports.tex = tex)
}

// We use two different observable stdlib instances: one for ourselves and one for the JS code in cell outputs
const observablehq_for_myself = make_library()
export const observablehq_for_cells = make_library()
export { observablehq_for_myself as default }
