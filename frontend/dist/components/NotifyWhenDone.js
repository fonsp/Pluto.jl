"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotifyWhenDone = void 0;
const Preact_js_1 = require("../imports/Preact.js");
const ClassTable_js_1 = require("../common/ClassTable.js");
const StatusTab_js_1 = require("./StatusTab.js");
const BottomRightPanel_js_1 = require("./BottomRightPanel.js");
const Editor_js_1 = require("./Editor.js");
const open_pluto_popup_js_1 = require("../common/open_pluto_popup.js");
/**
 * @param {{
 * status: import("./Editor.js").StatusEntryData,
 * }} props
 */
let NotifyWhenDone = ({ status }) => {
    const all_done = Object.values(status.subtasks).every(StatusTab_js_1.is_finished);
    const [enabled, setEnabled] = (0, Preact_js_1.useState)(false);
    (0, Preact_js_1.useEffect)(() => {
        if (enabled && all_done) {
            console.log("all done");
            /** @type {Notification?} */
            let notification = null;
            let timeouthandler = setTimeout(() => {
                setEnabled(false);
                let count = (0, StatusTab_js_1.total_done)(status);
                notification = new Notification("Pluto: notebook ready", {
                    tag: "notebook ready",
                    body: `✓ All ${count} steps completed`,
                    lang: "en-US",
                    dir: "ltr",
                    icon: Editor_js_1.url_logo_small,
                });
                notification.onclick = (e) => {
                    parent.focus();
                    window.focus();
                    notification?.close();
                };
            }, 3000);
            const vishandler = () => {
                if (document.visibilityState === "visible") {
                    notification?.close();
                }
            };
            document.addEventListener("visibilitychange", vishandler);
            document.body.addEventListener("click", vishandler);
            return () => {
                notification?.close();
                clearTimeout(timeouthandler);
                document.removeEventListener("visibilitychange", vishandler);
                document.body.removeEventListener("click", vishandler);
            };
        }
    }, [all_done]);
    const visible = (0, BottomRightPanel_js_1.useDelayedTruth)(!all_done, 2500) || enabled;
    return (0, Preact_js_1.html) `
        <div class=${(0, ClassTable_js_1.cl)({ visible, "notify-when-done": true })} inert=${!visible}>
            <label
                >${"Notify when done"}
                <input
                    type="checkbox"
                    checked=${enabled}
                    disabled=${!visible}
                    onInput=${(e) => {
        if (e.target.checked) {
            Notification.requestPermission().then((r) => {
                console.log(r);
                const granted = r === "granted";
                setEnabled(granted);
                e.target.checked = granted;
                if (!granted)
                    (0, open_pluto_popup_js_1.open_pluto_popup)({
                        type: "warn",
                        body: (0, Preact_js_1.html) `
                                            Pluto needs permission to show notifications. <strong>Enable notifications</strong> in your browser settings to use
                                            this feature.
                                        `,
                    });
            });
        }
        else {
            setEnabled(false);
        }
    }}
            /></label>
        </div>
    `;
};
exports.NotifyWhenDone = NotifyWhenDone;
