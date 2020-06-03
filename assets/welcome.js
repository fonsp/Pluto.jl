import { html } from "https://unpkg.com/htl@0.2.0/src/index.js";

import { createCodeMirrorFilepicker } from "./filepicker.js"
import { PlutoConnection } from "./common/PlutoConnection.js"

/* REMOTE & LOCALSTORAGE NOTEBOOK LISTS */

window.runningNotebookList = null
window.recentNotebookList = null

window.combinedNotebookList = null

function updateRecentNotebooks() {
    const storedString = localStorage.getItem("recent notebooks")
    const storedList = !!storedString ? JSON.parse(storedString) : []
    recentNotebookList = storedList.map(path => {
        return {
            path: path,
            shortpath: path.split("/").pop().split("\\").pop(),
        }
    })
    document.body.classList.toggle("nosessions", recentNotebookList.length == 0) // initial guess
}

updateRecentNotebooks()
// window.addEventListener("storage", updateRecentNotebooks)
// We don't do this 👆, to prevent the list order "jumping around" while you are interacting with it.

// Gets called _after_ the local list (recentNotebookList) is set.
function updateRunningNotebooks(list) {
    runningNotebookList = list
    updateCombinedNotebooks()
}

// We mutate the existing list, and try to maintain order, to prevent the list order "jumping around" while you are interacting with it.
// You can always get a neatly sorted list by refreshing the page.
function updateCombinedNotebooks() {
    if(!combinedNotebookList){
        // This is the initial render. Place running notebooks at the top.

        const runningPaths = runningNotebookList.map(nb => nb.path)

        combinedNotebookList = runningNotebookList.map(x => x) // shallow copy but that's okay
        recentNotebookList.forEach(nb => {
            if(!runningPaths.includes(nb.path)) { // if not already in the list...
                combinedNotebookList.push(nb) // ...add it.
            }
        })
    } else {
        // The list has already been generated and rendered to the page. Try to maintain order as much as possible.

        // already rendered notebooks will be added:
        const renderedRunning = []

        combinedNotebookList.forEach(nb => {
            var runningNb
            if(nb.uuid){
                runningNb = runningNotebookList.find(rnb => rnb.uuid == nb.uuid)
            } else {
                runningNb = runningNotebookList.find(rnb => rnb.path == nb.path)
            }
            if(runningNb){
                nb.uuid = runningNb.uuid
                nb.path = runningNb.path
                nb.shortpath = runningNb.shortpath
                renderedRunning.push(runningNb)
            } else {
                delete nb.uuid
            }
        })

        //const notRenderedRunning = setminus(runningNotebookList, renderedRunning)
        const notRenderedRunning = runningNotebookList.filter(rnb => !renderedRunning.includes(rnb))
        combinedNotebookList = notRenderedRunning.concat(combinedNotebookList)
    }

    showNotebooks()
}


/* RENDER TO PAGE */

function showNotebooks() {
    console.log("Running:")
    console.log(runningNotebookList)
    document.body.classList.toggle("nosessions", combinedNotebookList.length == 0)
    document.body.querySelector("main").replaceChild(renderNotebookList(combinedNotebookList), document.querySelector("ul#recent"))
    document.body.classList.remove("loading")
}

function renderNotebookList(list) {
    return html`<ul id="recent">
        ${list.map(nb => {
            const running = !!nb.uuid
            const li = html`<li class=${running ? "running" : "recent"}>
                <button
                  onclick=${event => onSessionClick(event)}
                  title=${running ? "Shut down notebook" : "Start notebook in background"}
                ><span></span></button>
                <a
                  href=${running ? `edit?uuid=${nb.uuid}` : `open?path=${encodeURIComponent(nb.path)}`}
                  title=${nb.path}
                >${nb.shortpath}</a>
            </li>`
            li.nb = nb
            return li
        })}
    </ul>`
}

/* RUN & SHUT DOWN IN BACKGROUND */

// move up the dom tree until the tag is found
function parentByTag(el, tag) {
    return (!el || el.tagName == tag) ? el : parentByTag(el.parentElement, tag)
}

function onSessionClick(event) {
    console.log
    const li = parentByTag(event.target, "LI")
    if(li.classList.replace("running", "transitioning")) {
        if (confirm("Shut down notebook process?")) {
            client.send("shutdownworkspace", {
                id: li.nb.uuid,
                remove_from_list: true,
            })
        } else {
            li.classList.replace("transitioning", "running")
        }

    } else if(li.classList.replace("recent", "transitioning")) {
        fetch(li.querySelector("a").href, {
            method: "GET",
            // redirect: "manual",
        }).then(r => {
            if(!r.redirected){
                throw new Error("file not found maybe? try opening the notebook directly")
            }
        }).catch(e => {
            console.error("Failed to start notebook in background")
            console.error(e)
            li.classList.replace("transitioning", "recent")
        })
    }
}

/* FILE PICKER */

const openFileButton = document.querySelector("filepicker>button")
openFileButton.addEventListener("click", openFile)

function openFile() {
    const path = filePickerCodeMirror.getValue()
    window.location.href = "open?path=" + encodeURIComponent(path)
}

let filePickerCodeMirror = createCodeMirrorFilepicker((elt) => {
    document.querySelector("filepicker").insertBefore(
        elt,
        openFileButton)
}, openFile, () => updateLocalNotebookPath(notebookPath), false)


/* SERVER CONNECTION */

function onUpdate(update, byMe) {
    var message = update.message

    switch (update.type) {
        case "notebook_list":
            // TODO: catch exception
            updateRunningNotebooks(message.notebooks)
            break
        default:
            console.error("Received unknown update type!")
            console.error(update)
            break
    }
}

function onEstablishConnection() {
    client.send("getallnotebooks", {})
    client.sendreceive("completepath", {
        query: "nothinginparticular",
    }) // to start JIT'ting
}

function onReconnect() {
    console.info("connected")
}

function onDisconnect() {
    console.info("disconnected")
}

window.client = new PlutoConnection(onUpdate, onEstablishConnection, onReconnect, onDisconnect)
client.initialize()
