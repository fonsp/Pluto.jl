// @ts-ignore
import hljs from "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.4.0/build/es/highlight.min.js"
// @ts-ignore
import hljs_julia from "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.4.0/build/es/languages/julia.min.js"
// @ts-ignore
import hljs_juliarepl from "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.4.0/build/es/languages/julia-repl.min.js"

hljs.registerLanguage("julia", hljs_julia)
hljs.registerLanguage("julia-repl", hljs_juliarepl)

export default hljs
