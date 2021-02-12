import { BinderPhase } from "../common/Binder.js"
import { html, useEffect, useState } from "../imports/Preact.js"

export const BinderButton = ({ binder_phase, start_binder, notebook_url }) => {
    const [popupOpen, setPopupOpen] = useState(false)
    const [fileURL, setFileURL] = useState("")
    const [showPopup, setShowPopup] = useState(false)
    useEffect(() => {
        /** This is equivalent to constructor and will only run once. Doing here to avoid adding more notebook state props */
        setFileURL(new URLSearchParams(window.location.search).get("notebookfile") ?? window.pluto_notebookfile)
    })
    useEffect(() => {
        const handlekeyup = (e) => {
            e.key === "Escape" && setPopupOpen(false)
        }
        const handleclick = (e) => {
            if (popupOpen && !e.composedPath().find((el) => el.id === "binder_help_text")) {
                setPopupOpen(false)
                // Avoid activating whatever was below
                e.stopPropagation()
                e.preventDefault()
            }
        }
        document.body.addEventListener("keyup", handlekeyup)
        document.body.addEventListener("click", handleclick)

        return () => {
            document.body.removeEventListener("keyup", handlekeyup)
            document.body.removeEventListener("click", handleclick)
        }
    }, [popupOpen])
    const show = binder_phase === BinderPhase.wait_for_user
    if (!show) return null
    return html` <div id="launch_binder">
        <span
            id="binder_launch_help"
            onClick=${(e) => {
                e.stopPropagation()
                e.preventDefault()
                setPopupOpen(!popupOpen)
            }}
            class="explain_binder"
            >Run this notebook 🏃🏽‍♀️🏃🏽‍♂️🏃🏽💨💨
        </span>
        ${popupOpen &&
        html` <div id="binder_help_text">
            <span onClick=${() => setPopupOpen(false)} class="close"></span>
            <h2>Hey!! 👋🏽👋🏽🙋🏽‍♀️ Here is how you can run this notebook 🏃🏽‍♀️🏃🏽‍♂️🏃🏽💨💨</h3>
            <h3> → In the cloud (experimental)</h4>
            <button onClick=${start_binder}>
                <span>Run with </span><img src="https://cdn.jsdelivr.net/gh/jupyterhub/binderhub@0.2.0/binderhub/static/logo.svg" height="30" alt="binder" />
            </button>
            <p style="margin-left:1rem; padding-left: .5rem; border-left: 4px solid lightgrey">
                <a target="_blank" href="https://mybinder.org">Binder</a> is a service that turns static notebooks to live! It is build to support reproducible
                science and is available for free. Clicking the binder button will open a session to the service. Note that it will take a while, usually 2-7
                minutes to get a session. Otherwise, you can always run this notebook locally:
            </p>
            <h3> → On your computer</h4>
            <ol>            
                <li>Make sure to <a href="https://computationalthinking.mit.edu/Spring21/installation/">install</a> 
                ${" "}all required software following the instructions found <a href="https://computationalthinking.mit.edu/Spring21/installation/">here</a>!
                </li>
                <li>
                    <div>
                        <div class="command">Copy this link:</div>
                        <div class="copy_div">
                            <input value=${fileURL} readonly />
                            <span
                                class=${`copy_icon ${showPopup ? "success_copy" : ""}`}
                                onClick=${() => {
                                    copyTextToClipboard(fileURL)
                                    setShowPopup(true)
                                    setTimeout(() => setShowPopup(false), 3000)
                                }}
                            />
                        </div>
                        <video playsinline autoplay loop style="width:450px" src="https://i.imgur.com/YdTDAht.mp4" />
                    </div>
                </li>
                <li>
                    <div class="command">Run Pluto</div>
                    <video playsinline autoplay loop style="width:450px" src="https://i.imgur.com/bmWpRIU.mp4" />
                </li>
                <li>
                    <div class="command">Paste URL in the 'Open' box and click 'Open'</div>
                    <video playsinline autoplay loop style="width:450px" src="https://i.imgur.com/wf60p5c.mp4" />
                </li>
            </ol>
        </div>`}
    </div>`
}

function copyTextToClipboard(text, onSuccess, onFail) {
    if (!navigator.clipboard) {
        alert("Please use a newer browser")
    }
    navigator.clipboard.writeText(text).then(
        function () {
            console.error("Copied to clipboard!")
        },
        function (err) {
            console.error("Async: Could not copy text: ", err)
        }
    )
}
