import "https://cdn.jsdelivr.net/npm/requestidlecallback-polyfill@1.0.2/index.js"
import { get_included_external_source } from "./external_source.js"

let setup_done = false

export const setup_mathjax = () => {
    if (setup_done) {
        return
    }
    setup_done = true

    const deprecated = () =>
        console.error(
            "Pluto.jl: Pluto loads MathJax 3 globally, but a MathJax 2 function was called. The two version can not be used together on the same web page."
        )
    const twowasloaded = () =>
        console.error(
            "Pluto.jl: MathJax 2 is already loaded in this page, but Pluto wants to load MathJax 3. Packages that import MathJax 2 in their html display will break Pluto's ability to render latex."
        )

    // @ts-ignore
    window.MathJax = {
        options: {
            ignoreHtmlClass: "no-MαθJax",
            processHtmlClass: "tex",
        },
        startup: {
            typeset: true, // because we load MathJax asynchronously
            ready: () => {
                // @ts-ignore
                window.MathJax.startup.defaultReady()

                // plotly uses MathJax 2, so we have this shim to make it work kindof
                // @ts-ignore
                window.MathJax.Hub = {
                    Queue: function () {
                        for (var i = 0, m = arguments.length; i < m; i++) {
                            // @ts-ignore
                            var fn = window.MathJax.Callback(arguments[i])
                            // @ts-ignore
                            window.MathJax.startup.promise = window.MathJax.startup.promise.then(fn)
                        }
                        // @ts-ignore
                        return window.MathJax.startup.promise
                    },
                    Typeset: function (elements, callback) {
                        // @ts-ignore
                        var promise = window.MathJax.typesetPromise(elements)
                        if (callback) {
                            promise = promise.then(callback)
                        }
                        return promise
                    },
                    Register: {
                        MessageHook: deprecated,
                        StartupHook: deprecated,
                        LoadHook: deprecated,
                    },
                    Config: deprecated,
                    Configured: deprecated,
                    setRenderer: deprecated,
                }
            },
        },
        tex: {
            inlineMath: [
                ["$", "$"],
                ["\\(", "\\)"],
            ],
        },
        svg: {
            fontCache: "global",
        },
    }

    requestIdleCallback(
        () => {
            console.log("Loading mathjax!!")
            const src = get_included_external_source("MathJax-script")
            if (!src) throw new Error("Could not find mathjax source")

            const script = document.createElement("script")
            script.addEventListener("load", () => {
                console.log("MathJax loaded!")
                if (window["MathJax"]?.version !== "3.2.2") {
                    twowasloaded()
                }
            })
            script.crossOrigin = src.crossOrigin
            script.integrity = src.integrity
            script.src = src.href
            document.head.append(script)
        },
        { timeout: 2000 }
    )
}
