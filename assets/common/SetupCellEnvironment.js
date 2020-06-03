import Library from "https://unpkg.com/@observablehq/stdlib@3.3.1/src/library.js?module"

async function loadLibrary(){
    // make observablehq stdlib available to JS code inside cells, by setting window.DOM, window.html, etc
    const observablehq = new Library()
    //Object.assign(window, observablehq)
    window.DOM = observablehq.DOM
    window.Files = observablehq.Files
    window.Generators = observablehq.Generators
    window.Promises = observablehq.Promises
    window.now = observablehq.now
    window.svg = observablehq.svg()
    window.md = await observablehq.md()
    // window.tex = observablehq.tex() TODO
    window.html = observablehq.html()
    window.require = observablehq.require()
}

loadLibrary()
