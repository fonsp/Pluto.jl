import { html, useEffect, useState } from "../imports/Preact.js"

import { cl } from "../common/ClassTable.js"
import { is_finished, total_done } from "./StatusTab.js"
import { useDelayedTruth } from "./BottomRightPanel.js"
import { url_logo_small } from "./Editor.js"
import { open_pluto_popup } from "../common/open_pluto_popup.js"

/**
 * @param {{
 * status: import("./Editor.js").StatusEntryData,
 * }} props
 */
export let NotifyWhenDone = ({ status }) => {
    const all_done = Object.values(status.subtasks).every(is_finished)

    const [enabled, setEnabled] = useState(false)

    useEffect(() => {
        if (enabled && all_done) {
            console.log("all done")

            /** @type {Notification?} */
            let notification = null

            let timeouthandler = setTimeout(() => {
                setEnabled(false)
                let count = total_done(status)
                notification = new Notification("Pluto: notebook ready", {
                    tag: "notebook ready",
                    body: `✓ All ${count} steps completed`,
                    lang: "en-US",
                    dir: "ltr",
                    icon: url_logo_small,
                })
                notification.onclick = (e) => {
                    parent.focus()
                    window.focus()
                    notification?.close()
                }
            }, 3000)

            const vishandler = () => {
                if (document.visibilityState === "visible") {
                    notification?.close()
                }
            }
            document.addEventListener("visibilitychange", vishandler)
            document.body.addEventListener("click", vishandler)

            return () => {
                notification?.close()

                clearTimeout(timeouthandler)
                document.removeEventListener("visibilitychange", vishandler)
                document.body.removeEventListener("click", vishandler)
            }
        }
    }, [all_done])

    const visible = useDelayedTruth(!all_done, 2500) || enabled

    return html`
        <div class=${cl({ visible, "notify-when-done": true })} inert=${!visible}>
            <label
                >${"Notify when done"}
                <input
                    type="checkbox"
                    checked=${enabled}
                    disabled=${!visible}
                    onInput=${(e) => {
                        if (e.target.checked) {
                            Notification.requestPermission().then((r) => {
                                console.log(r)
                                const granted = r === "granted"
                                setEnabled(granted)
                                e.target.checked = granted

                                if (!granted)
                                    open_pluto_popup({
                                        type: "warn",
                                        body: html`
                                            Pluto needs permission to show notifications. <strong>Enable notifications</strong> in your browser settings to use
                                            this feature.
                                        `,
                                    })
                            })
                        } else {
                            setEnabled(false)
                        }
                    }}
            /></label>
        </div>
    `
}
