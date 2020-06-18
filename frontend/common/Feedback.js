import { code_differs } from "../components/Cell.js"

const timeout_promise = (promise, time_ms) =>
    Promise.race([
        promise,
        new Promise((res, rej) => {
            setTimeout(() => {
                rej(new Error("Promise timed out."))
            }, time_ms)
        }),
    ])

export const create_counter_statistics = () => {
    return {
        numEvals: 0, // integer
        numRuns: 0, // integer
        numBondSets: 0, // integer
    }
}

const first_line = (cell) => /(.*)/.exec(cell.local_code.body)[0]
const count_matches = (pattern, haystack) => (haystack.match(pattern) || []).length
const value_counts = (values) =>
    values.reduce((prev_counts, val) => {
        prev_counts[val] = prev_counts[val] ? prev_counts[val] + 1 : 1
        return prev_counts
    }, {})
const sum = (values) => values.reduce((a, b) => a + b, 0)

export const finalize_statistics = async (state, client, counter_statistics) => {
    const cells = state.notebook.cells

    const statistics = {
        numCells: cells.length,
        // integer
        numErrored: cells.filter((c) => c.errored).length,
        // integer
        numFolded: cells.filter((c) => c.code_folded).length,
        // integer
        numCodeDiffers: cells.filter(code_differs).length,
        // integer
        numMarkdowns: cells.filter((c) => first_line(c).startsWith('md"')).length,
        // integer
        numBinds: sum(cells.map((c) => count_matches(/\@bind/g, c.local_code.body))),
        // integer
        numBegins: cells.filter((c) => first_line(c).endsWith("begin")).length,
        // integer
        numLets: cells.filter((c) => first_line(c).endsWith("let")).length,
        // integer
        cellSizes: value_counts(cells.map((c) => count_matches(/\n/g, c.local_code.body) + 1)),
        // {numLines: numCells, ...}
        // e.g. {1: 28,  3: 14,  5: 7,  7: 1,  12: 1,  14: 1}
        runtimes: value_counts(cells.map((c) => Math.floor(Math.log10(c.runtime + 1)))),
        // {runtime: numCells, ...}
        // where `runtime` is log10, rounded
        // e.g. {1: 28,  3: 14,  5: 7,  7: 1,  12: 1,  14: 1}
        // integer
        versionPluto: client.pluto_version,
        // string, e.g. "v0.7.10"
        // versionJulia: client.julia_version,
        //     // string, e.g. "v1.0.5"
        timestamp: firebase.firestore.Timestamp.now(),
        // timestamp (ms)
        screenWidthApprox: 100 * Math.round(document.body.clientWidth / 100),
        // number, rounded to nearest multiple of 100
        docsOpen: parseFloat(window.getComputedStyle(document.querySelector("helpbox")).height) > 200,
        // bool
        hasFocus: document.hasFocus(),
        // bool
        numConcurrentNotebooks: NaN, // integer
        pingTimeWS: NaN, // integer (ms),
        pingTimeHTTP: NaN, // integer (ms)
        ...counter_statistics,
    }

    let { message } = await client.sendreceive("getallnotebooks", {})
    statistics.numConcurrentNotebooks = message.notebooks.length

    await fetch("ping")
    const ticHTTP = Date.now()
    await fetch("ping")
    statistics.pingTimeHTTP = Date.now() - ticHTTP

    await client.sendreceive("getversion", {})
    const ticWS = Date.now()
    await client.sendreceive("getversion", {})
    statistics.pingTimeWS = Date.now() - ticWS

    return statistics
}

export const store_statistics_sample = (statistics) => localStorage.setItem("statistics sample", JSON.stringify(statistics, null, 4))

// TODO
//document.querySelector("footer a#statistics-info").addEventListener("click", store_statistics_sample)

const feedbackdb = {
    instance: null,
}
const init_firebase = () => {
    firebase.initializeApp({
        apiKey: "AIzaSyC0DqEcaM8AZ6cvApXuNcNU2RgZZOj7F68",
        authDomain: "localhost",
        projectId: "pluto-feedback",
    })
    feedbackdb.instance = firebase.firestore()
}

export const init_feedback = () => {
    init_firebase()

    const feedbackform = document.querySelector("form#feedback")
    feedbackform.addEventListener("submit", (e) => {
        const email = prompt("Would you like us to contact you?\n\nEmail: (leave blank to stay anonymous 👀)")

        timeout_promise(
            feedbackdb.instance.collection("feedback").add({
                feedback: new FormData(e.target).get("opinion"),
                timestamp: firebase.firestore.Timestamp.now(),
                email: email ? email : "",
            }),
            5000
        )
            .then(() => {
                let message = "Submitted. Thank you for your feedback! 💕"
                console.log(message)
                alert(message)
                feedbackform.querySelector("#opinion").value = ""
            })
            .catch((error) => {
                let message =
                    "Whoops, failed to send feedback 😢\nWe would really like to hear from you! Please got to https://github.com/fonsp/Pluto.jl/issues to report this failure:\n\n"
                console.error(message)
                console.error(error)
                alert(message + error)
            })
        e.preventDefault()
    })
}

export const send_statistics_if_enabled = (statistics) => {
    if (localStorage.getItem("statistics enable") && localStorage.getItem("statistics enable") == "true") {
        timeout_promise(feedbackdb.instance.collection("statistics").add(statistics), 10000).catch((error) => {
            console.error("Failed to send statistics:")
            console.error(error)
        })
    }
}
