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
        <button onClick=${start_binder}>
            <span>Run with </span><img src="https://cdn.jsdelivr.net/gh/jupyterhub/binderhub@0.2.0/binderhub/static/logo.svg" height="30" alt="binder" />
        </button>
        <span
            id="binder_launch_help"
            onClick=${(e) => {
                e.stopPropagation()
                e.preventDefault()
                setPopupOpen(!popupOpen)
            }}
            class="explain_binder"
            >Help!</span
        >
        ${popupOpen &&
        html` <div id="binder_help_text">
            <span onClick=${() => setPopupOpen(false)} class="close"></span>
            <h3>Hey!! 👋🏽👋🏽🙋🏽‍♀️ Here some answers</h3>
            <h4>What is binder?</h4>
            <p>
                <a target="_blank" href="https://mybinder.org">Binder</a> is a service that turns static notebooks to live! It is build to support reproducible
                science and is available for free. Clicking the binder button will open a session to the service. Note that it will take a while, usually 2-7
                minutes to get a session. Otherwise, you can always run this notebook locally:
            </p>
            <h4>How to run locally:</h4>
            <ol>
                <li>
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
