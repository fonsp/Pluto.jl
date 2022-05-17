import "https://cdn.jsdelivr.net/npm/requestidlecallback-polyfill@1.0.2/index.js"

let setup_done = false

export const setup_mathjax = () => {
    if (setup_done) {
        return
    }
    setup_done = true

    const deprecated = () => console.warn("Pluto uses MathJax 3, but a MathJax 2 function was called.")

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
            const script = document.head.querySelector("#MathJax-script")
            script.setAttribute("src", script.getAttribute("not-the-src-yet"))
        },
        { timeout: 2000 }
    )
}
