import Library from "https://unpkg.com/@observablehq/stdlib@3.3.1/src/library.js?module"

// make observablehq stdlib available to JS code inside cells, by setting window.DOM, window.html, etc
const observablehq = new Library()
Object.assign(window, observablehq)