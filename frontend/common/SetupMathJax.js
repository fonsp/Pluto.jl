const deprecated = () => console.warn("Pluto uses MathJax 3, but a MathJax 2 function was called.")

window.MathJax = {
    options: {
        ignoreHtmlClass: "no-MαθJax",
        processHtmlClass: "tex",
    },
    startup: {
        typeset: true, // because we load MathJax asynchronously
        ready: () => {
            window.MathJax.startup.defaultReady()

            // plotly uses MathJax 2, so we have this shim to make it work kindof
            window.MathJax.Hub = {
                Queue: function () {
                    for (var i = 0, m = arguments.length; i < m; i++) {
                        var fn = window.MathJax.Callback(arguments[i])
                        window.MathJax.startup.promise = window.MathJax.startup.promise.then(fn)
                    }
                    return window.MathJax.startup.promise
                },
                Typeset: function (elements, callback) {
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
