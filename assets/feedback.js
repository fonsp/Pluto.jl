function timeoutPromise(promise, time_ms) {
    return Promise.race([
        promise,
        new Promise((res, rej) => {
            setTimeout(() => {
                rej(new Error("Promise timed out."))
            }, time_ms)
        })
    ])
}

function measurePingTimes() {
    fetch("ping").then(() => {
        const ticHTTP = Date.now()
        fetch("ping").then(() => {
            window.statistics.pingTimeHTTP = Date.now() - ticHTTP
        })
    })
    client.sendreceive("getversion", {}).then(() => {
        const ticWS = Date.now()
        client.sendreceive("getversion", {}).then(() => {
            window.statistics.pingTimeWS = Date.now() - ticWS
        })
    })
}

function resetStatistics() {
    window.statistics = {
        get numCells() {
            return Object.values(window.codeMirrors).length
            // integer
        },
        get numErrored() {
            return Object.values(window.localCells).filter(c => c.classList.contains("error")).length
            // integer
        },
        get numFolded() {
            return Object.values(window.localCells).filter(c => c.classList.contains("code-folded")).length
            // integer
        },
        get numCodeDiffers() {
            return Object.values(window.localCells).filter(c => c.classList.contains("code-differs")).length
            // integer
        },
        get numMarkdowns() {
            return Object.values(window.codeMirrors).filter(cm => cm.getLine(0).startsWith("md\"")).length
            // integer
        },
        get numBinds() {
            return Object.values(window.codeMirrors).map(cm => (cm.getValue().match(/\@bind/g) || []).length).reduce((a, b) => a + b, 0)
            // integer
        },
        get numBegins() {
            return Object.values(window.codeMirrors).filter(cm => cm.getLine(0).endsWith("begin")).length
            // integer
        },
        get numLets() {
            return Object.values(window.codeMirrors).filter(cm => cm.getLine(0).endsWith("let")).length
            // integer
        },
        get numConcurrentNotebooks() {
            return window.remoteNotebookList.length
            // integer
        },
        get cellSizes() {
            return Object.values(window.codeMirrors).map(cm => cm.lineCount()).reduce((a, b) => { a[b] = a[b] ? a[b] + 1 : 1; return a }, {})
            // {numLines: numCells, ...}
            // e.g. {1: 28,  3: 14,  5: 7,  7: 1,  12: 1,  14: 1}
        },
        get runtimes() {
            return Object.values(window.localCells).map(c => Math.floor(Math.log10(c.runtime + 1))).reduce((a, b) => { a[b] = a[b] ? a[b] + 1 : 1; return a }, {})
            // {runtime: numCells, ...}
            // where `runtime` is log10, rounded
            // e.g. {1: 28,  3: 14,  5: 7,  7: 1,  12: 1,  14: 1}
        },
        get versionPluto() {
            return window.client.plutoVersion
            // string, e.g. "v0.7.10"
        },
        // get versionJulia() {
        //     return window.client.juliaVersion
        //     // string, e.g. "v1.0.5"
        // },
        get timestamp() {
            return firebase.firestore.Timestamp.now()
            // timestamp (ms)
        },
        get screenWidthApprox() {
            return 100 * Math.round(document.body.clientWidth / 100)
            // number, rounded to nearest multiple of 100
        },
        get docsOpen() {
            return parseFloat(window.getComputedStyle(doc).height) > 200
            // bool
        },
        get hasFocus() {
            return document.hasFocus()
            // bool
        },
        pingTimeWS: NaN, // integer (ms)
        pingTimeHTTP: NaN, // integer (ms)
        numEvals: 0, // integer
        numRuns: 0, // integer
        numBondSets: 0, // integer
    }
}

function storeStatisticsSample() {
    localStorage.setItem("statistics sample", JSON.stringify(window.statistics, null, 4))
}

resetStatistics()
storeStatisticsSample()
document.querySelector("footer a#statistics-info").addEventListener("click", storeStatisticsSample)

setTimeout(() => {
    firebase.initializeApp({
        apiKey: 'AIzaSyC0DqEcaM8AZ6cvApXuNcNU2RgZZOj7F68',
        authDomain: 'localhost',
        projectId: 'pluto-feedback',
    });

    window.feedbackdb = firebase.firestore();

    window.feedbackform = document.querySelector("form#feedback")
    feedbackform.addEventListener("submit", (e) => {
        const email = prompt("Would you like us to contact you?\n\nEmail: (leave blank to stay anonymous 👀)")

        timeoutPromise(
            feedbackdb.collection("feedback").add({
                feedback: new FormData(e.target).get("opinion"),
                timestamp: firebase.firestore.Timestamp.now(),
                email: email ? email : "",
            }), 5000)
            .then(function () {
                message = "Submitted. Thank you for your feedback! 💕"
                console.log(message)
                alert(message)
                feedbackform.querySelector("#opinion").value = ""
            })
            .catch(function (error) {
                message = "Whoops, failed to send feedback 😢\nWe would really like to hear from you! Please got to https://github.com/fonsp/Pluto.jl/issues to report this failure:\n\n"
                console.error(message)
                console.error(error)
                alert(message + error)
            })

        e.preventDefault()
    })

    localStorage.setItem("statistics sample", JSON.stringify(window.statistics, null, 4))

    setInterval(() => {
        measurePingTimes()

        setTimeout(() => {
            storeStatisticsSample()
            if (!localStorage.getItem("statistics enable") || (localStorage.getItem("statistics enable") == "true")) {
                feedbackdb.collection("statistics").add(window.statistics)
                    .catch(function (error) {
                        console.error("Failed to send statistics:")
                        console.error(error)
                    })
            }
            resetStatistics()
        }, 10 * 1000) // 10 seconds - allow some time for the pinging to complete
    }, 10 * 60 * 1000) // 10 minutes - statistics interval
}, 10 * 1000) // 10 seconds - load feedback a little later for snappier UI