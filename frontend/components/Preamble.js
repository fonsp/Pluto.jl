import { html, useEffect, useState, useContext, useRef } from "../imports/Preact.js"
import { cl } from "../common/ClassTable.js"
import { PlutoContext } from "../common/PlutoContext.js"
import { is_mac_keyboard } from "../common/KeyboardShortcuts.js"
import { RunArea, useDebouncedTruth, useDelayedTruth } from "./RunArea.js"

export const Preamble = ({ any_code_differs, last_update_time, last_save_trigger_time }) => {
    let pluto_actions = useContext(PlutoContext)

    const any_code_differs_delayed = useDelayedTruth(any_code_differs)

    const [state, set_state] = useState("")
    const timeout_ref = useRef(null)

    useEffect(() => {
        clearTimeout(timeout_ref.current)
        if (any_code_differs_delayed) {
            set_state("ask_to_save")
        } else {
            if (Date.now() - last_save_trigger_time < 1000 || Date.now() - last_update_time < 1000) {
                set_state("saved")
                timeout_ref.current = setTimeout(() => {
                    set_state("")
                }, 1000)
            } else {
                set_state("")
            }
        }
    }, [any_code_differs_delayed])

    useEffect(() => {
        const diff = Date.now() - last_save_trigger_time

        console.log({ diff, last_save_trigger_time, last_update_time, any_code_differs, any_code_differs_delayed })
        if (!any_code_differs && diff >= 0 && diff < 300) {
            set_state("saved")
            timeout_ref.current = setTimeout(() => {
                set_state("")
            }, 1000)
        }
    }, [any_code_differs])

    return html`<preamble>
        ${state === "ask_to_save"
            ? html`
                  <div id="saveall-container" class=${state}>
                      <button
                          onClick=${() => {
                              pluto_actions.set_and_run_all_changed_remote_cells()
                          }}
                          class=${cl({ runallchanged: true })}
                          title="Save and run all changed cells"
                      >
                          <span class="only-on-hover"><b>Save all changes</b> </span>${is_mac_keyboard
                              ? html`<kbd>⌘ S</kbd>`
                              : html`<kbd>Ctrl</kbd>+<kbd>S</kbd>`}
                      </button>
                  </div>
              `
            : state === "saved" || state === "saving"
            ? html`
                  <div id="saveall-container" class=${state}>
                      <span><span class="only-on-hover">Saved </span><span class="saved-icon"></span></span>
                  </div>
              `
            : null}
    </preamble>`
}
