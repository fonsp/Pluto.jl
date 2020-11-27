import { timeout_promise } from "./PlutoConnection.js"

export const create_counter_statistics = () => {
    return {
        numEvals: 0, // integer
        numRuns: 0, // integer
        numBondSets: 0, // integer
    }
}

const first_line = (cell) => /(.*)/.exec(cell.code)[0]
const count_matches = (pattern, haystack) => (haystack.match(pattern) || []).length
const value_counts = (values) =>
    values.reduce((prev_counts, val) => {
        prev_counts[val] = prev_counts[val] ? prev_counts[val] + 1 : 1
        return prev_counts
    }, {})
const sum = (values) => values.reduce((a, b) => a + b, 0)

/**
 * @param {{
 *  notebook: import("../components/Editor.js").NotebookData
 *  cells_local: { [id: string]: import("../components/Editor.js").CellData }
 * }} state
 * */
export const finalize_statistics = async (state, client, counter_statistics) => {
    const cells_running = state.notebook.cell_order.map((cell_id) => state.notebook.cells_running[cell_id]).filter((x) => x != null)
    const cells = state.notebook.cell_order.map((cell_id) => state.notebook.cell_dict[cell_id]).filter((x) => x != null)
    const cells_local = state.notebook.cell_order.map((cell_id) => {
        return {
            ...(state.cells_local[cell_id] ?? state.notebook.cell_dict[cell_id]),
            ...state.cells_local[cell_id],
        }
    })

    const statistics = {
        numCells: cells.length,
        // integer
        numErrored: cells_running.filter((c) => c.errored).length,
        // integer
        numFolded: cells.filter((c) => c.code_folded).length,
        // integer
        numCodeDiffers: state.notebook.cell_order.filter(
            (cell_id) => state.notebook.cell_dict[cell_id].code === (state.cells_local[cell_id]?.code ?? state.notebook.cell_dict[cell_id].code)
        ).length,
        // integer
        numMarkdowns: cells_local.filter((c) => first_line(c).startsWith('md"')).length,
        // integer
        numBinds: sum(cells_local.map((c) => count_matches(/\@bind/g, c.code))),
        // integer
        numBegins: cells_local.filter((c) => first_line(c).endsWith("begin")).length,
        // integer
        numLets: cells_local.filter((c) => first_line(c).endsWith("let")).length,
        // integer
        cellSizes: value_counts(cells_local.map((c) => count_matches(/\n/g, c.code) + 1)),
        // {numLines: numCells, ...}
        // e.g. {1: 28,  3: 14,  5: 7,  7: 1,  12: 1,  14: 1}
        runtimes: value_counts(cells_running.map((c) => Math.floor(Math.log10(c.runtime + 1)))),
        // {runtime: numCells, ...}
        // where `runtime` is log10, rounded
        // e.g. {1: 28,  3: 14,  5: 7,  7: 1,  12: 1,  14: 1}
        // integer
        versionPluto: client.version_info == null ? "unkown" : client.version_info.pluto,
        // string, e.g. "v0.7.10"
        // versionJulia: client.julia_version,
        //     // string, e.g. "v1.0.5"
        // @ts-ignore
        timestamp: firebase.firestore.Timestamp.now(),
        // timestamp (ms)
        screenWidthApprox: 100 * Math.round(document.body.clientWidth / 100),
        // number, rounded to nearest multiple of 100
        docsOpen: parseFloat(window.getComputedStyle(document.querySelector("pluto-helpbox")).height) > 200,
        // bool
        hasFocus: document.hasFocus(),
        // bool
        numConcurrentNotebooks: NaN, // integer
        pingTimeWS: NaN, // integer (ms),
        pingTimeHTTP: NaN, // integer (ms)
        ...counter_statistics,
    }

    try {
        let { message } = await client.send("get_all_notebooks")
        statistics.numConcurrentNotebooks = message.notebooks.length

        await fetch("ping")
        const ticHTTP = Date.now()
        await fetch("ping")
        statistics.pingTimeHTTP = Date.now() - ticHTTP

        await client.send("ping")
        const ticWS = Date.now()
        await client.send("ping")
        statistics.pingTimeWS = Date.now() - ticWS
    } catch (ex) {
        console.log("Failed to measure ping times")
        console.log(ex)
    }

    return statistics
}

export const store_statistics_sample = (statistics) => localStorage.setItem("statistics sample", JSON.stringify(statistics, null, 4))

// TODO
//document.querySelector("footer a#statistics-info").addEventListener("click", store_statistics_sample)

const feedbackdb = {
    instance: null,
}
const init_firebase = () => {
    // @ts-ignore
    firebase.initializeApp({
        apiKey: "AIzaSyC0DqEcaM8AZ6cvApXuNcNU2RgZZOj7F68",
        authDomain: "localhost",
        projectId: "pluto-feedback",
    })
    // @ts-ignore
    feedbackdb.instance = firebase.firestore()
}

export const init_feedback = () => {
    init_firebase()

    const feedbackform = document.querySelector("form#feedback")
    feedbackform.addEventListener("submit", (e) => {
        const email = prompt("Would you like us to contact you?\n\nEmail: (leave blank to stay anonymous 👀)")

        timeout_promise(
            feedbackdb.instance.collection("feedback").add({
                // @ts-ignore
                feedback: new FormData(e.target).get("opinion"),
                // @ts-ignore
                timestamp: firebase.firestore.Timestamp.now(),
                email: email ? email : "",
            }),
            5000
        )
            .then(() => {
                let message = "Submitted. Thank you for your feedback! 💕"
                console.log(message)
                alert(message)
                // @ts-ignore
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
