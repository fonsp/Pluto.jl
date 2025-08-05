"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Preamble = void 0;
const Preact_js_1 = require("../imports/Preact.js");
const ClassTable_js_1 = require("../common/ClassTable.js");
const PlutoContext_js_1 = require("../common/PlutoContext.js");
const KeyboardShortcuts_js_1 = require("../common/KeyboardShortcuts.js");
const await_focus = () => document.visibilityState === "visible"
    ? Promise.resolve()
    : new Promise((res) => {
        const h = () => {
            await_focus().then(res);
            document.removeEventListener("visibilitychange", h);
        };
        document.addEventListener("visibilitychange", h);
    });
const Preamble = ({ any_code_differs, last_update_time, last_hot_reload_time, connected }) => {
    let pluto_actions = (0, Preact_js_1.useContext)(PlutoContext_js_1.PlutoActionsContext);
    const [state, set_state] = (0, Preact_js_1.useState)("");
    const [reload_state, set_reload_state] = (0, Preact_js_1.useState)("");
    const timeout_ref = (0, Preact_js_1.useRef)(null);
    const reload_timeout_ref = (0, Preact_js_1.useRef)(null);
    (0, Preact_js_1.useEffect)(() => {
        // console.log("code differs", any_code_differs)
        clearTimeout(timeout_ref?.current);
        if (any_code_differs) {
            set_state("ask_to_save");
        }
        else {
            if (Date.now() - last_update_time < 1000) {
                set_state("saved");
                timeout_ref.current = setTimeout(() => {
                    set_state("");
                }, 1000);
            }
            else {
                set_state("");
            }
        }
        return () => clearTimeout(timeout_ref?.current);
    }, [any_code_differs]);
    // silly bits to not show "Reloaded from file" immediately
    const [old_enough, set_old_enough] = (0, Preact_js_1.useState)(false);
    (0, Preact_js_1.useEffect)(() => {
        if (connected) {
            setTimeout(() => set_old_enough(true), 1000);
        }
    }, [connected]);
    (0, Preact_js_1.useEffect)(() => {
        console.log("Hottt", last_hot_reload_time, old_enough);
        if (old_enough) {
            set_reload_state("reloaded_from_file");
            console.log("set state");
            await_focus().then(() => {
                reload_timeout_ref.current = setTimeout(() => {
                    set_reload_state("");
                    console.log("reset state");
                }, 8000);
            });
            return () => clearTimeout(reload_timeout_ref?.current);
        }
    }, [last_hot_reload_time]);
    return (0, Preact_js_1.html) `<preamble>
        ${state === "ask_to_save"
        ? (0, Preact_js_1.html) `
                  <div id="saveall-container" class="overlay-button ${state}">
                      <button
                          onClick=${() => {
            set_state("saving");
            pluto_actions.set_and_run_all_changed_remote_cells();
        }}
                          class=${(0, ClassTable_js_1.cl)({ runallchanged: true })}
                          title="Save and run all changed cells"
                      >
                          <span class="only-on-hover"><b>Save all changes</b> </span>${KeyboardShortcuts_js_1.is_mac_keyboard
            ? (0, Preact_js_1.html) `<kbd>⌘ S</kbd>`
            : (0, Preact_js_1.html) `<kbd>Ctrl</kbd>+<kbd>S</kbd>`}
                      </button>
                  </div>
              `
        : // : state === "saving"
            // ? html` <div id="saveall-container" class="overlay-button ${state}">Saving... <span class="saving-icon"></span></div> `
            state === "saved" || state === "saving"
                ? (0, Preact_js_1.html) `
                  <div id="saveall-container" class="overlay-button ${state}">
                      <span><span class="only-on-hover">Saved </span><span class="saved-icon pluto-icon"></span></span>
                  </div>
              `
                : reload_state === "reloaded_from_file"
                    ? (0, Preact_js_1.html) `
                  <div id="saveall-container" class="overlay-button ${state}">
                      <span>File change detected, <b>notebook updated </b><span class="saved-icon pluto-icon"></span></span>
                  </div>
              `
                    : null}
    </preamble>`;
};
exports.Preamble = Preamble;
