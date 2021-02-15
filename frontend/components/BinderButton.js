import { BinderPhase } from "../common/Binder.js"
import { html, useEffect, useState, useRef } from "../imports/Preact.js"

export const BinderButton = ({ binder_phase, start_binder, notebookfile }) => {
    const [popupOpen, setPopupOpen] = useState(false)
    const [showCopyPopup, setShowCopyPopup] = useState(false)
    const notebookfile_ref = useRef("")
    notebookfile_ref.current = notebookfile

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
            ><b>Edit</b> or <b>run</b> this notebook</span
        >
        ${popupOpen &&
        html` <div id="binder_help_text">
            <span onClick=${() => setPopupOpen(false)} class="close"></span>
            <p style="text-align: center;">
                ${`You can interact with sliders and buttons directly on our website! To be able to edit code and run cells, you need to run the notebook yourself. `}
                <b>Where would you like to run the notebook?</b>
            </p>
            <h2 style="margin-top: 3em;">In the cloud <em>(experimental)</em></h2>
            <div style="padding: 0 2rem;">
                <button onClick=${start_binder}>
                    <img src="https://cdn.jsdelivr.net/gh/jupyterhub/binderhub@0.2.0/binderhub/static/logo.svg" height="30" alt="binder" />
                </button>
            </div>
            <p style="opacity: .5; margin: 20px 10px;">
                <a target="_blank" href="https://mybinder.org">Binder</a> is a free, open source service that runs scientific notebooks in the cloud! It will
                take a while, usually 2-7 minutes to get a session.
            </p>
            <h2 style="margin-top: 4em;">On your computer</h2>
            <p style="opacity: .5;">(Recommended for working on the homework exercises.)</p>
            <ol style="padding: 0 2rem;">
                <li>
                    <div>
                        <div class="command">Copy the notebook URL:</div>
                        <div class="copy_div">
                            <input onClick=${(e) => e.target.select()} value=${notebookfile_ref.current} readonly />
                            <span
                                class=${`copy_icon ${showCopyPopup ? "success_copy" : ""}`}
                                onClick=${() => {
                                    copyTextToClipboard(notebookfile_ref.current)
                                    setShowCopyPopup(true)
                                    setTimeout(() => setShowCopyPopup(false), 3000)
                                }}
                            />
                        </div>
                    </div>
                </li>
                <li>
                    <div class="command">Run Pluto</div>
                    <p>
                        ${"(Also see: "}
                        <a target="_blank" href="https://computationalthinking.mit.edu/Spring21/installation/">How to install Julia and Pluto</a>)
                    </p>
                    <img src="https://user-images.githubusercontent.com/6933510/107865594-60864b00-6e68-11eb-9625-2d11fd608e7b.png" />
                </li>
                <li>
                    <div class="command">Paste URL in the <em>Open</em> box</div>
                    <video playsinline autoplay loop src="https://i.imgur.com/wf60p5c.mp4" />
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
