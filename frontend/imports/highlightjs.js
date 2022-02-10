// @ts-ignore
import hljs from "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.3.1/build/es/highlight.min.js"
// @ts-ignore
import hljs_julia from "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.3.1/build/es/languages/julia.min.js"
// @ts-ignore
import hljs_juliarepl from "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.3.1/build/es/languages/julia-repl.min.js"

hljs.registerLanguage("julia", hljs_julia)
hljs.registerLanguage("julia-repl", hljs_juliarepl)
// https://github.com/highlightjs/highlight.js/pull/3432
hljs.registerAliases(["jldoctest"], { languageName: "julia-repl" })

export default hljs
