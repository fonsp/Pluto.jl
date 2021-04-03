import { html, useEffect, useState, useContext, useRef } from "../imports/Preact.js"
import { cl } from "../common/ClassTable.js"
import { PlutoContext } from "../common/PlutoContext.js"
import { has_ctrl_or_cmd_pressed, ctrl_or_cmd_name, is_mac_keyboard, in_textarea_or_input } from "../common/KeyboardShortcuts.js"

export const Preamble = ({ any_code_differs, last_apply_patches }) => {
    let pluto_actions = useContext(PlutoContext)

    const [state, set_state] = useState("")
    const timeout_ref = useRef(null)

    useEffect(() => {
        clearTimeout(timeout_ref.current)
        if (any_code_differs) {
            set_state("ask_to_save")
        } else {
            if (Date.now() - last_apply_patches < 1000) {
                set_state("saved")
                timeout_ref.current = setTimeout(() => {
                    set_state("")
                }, 1000)
            } else {
                set_state("")
            }
        }
    }, [any_code_differs])

    return html`<preamble>
        ${state === "ask_to_save"
            ? html`
                  <div id="saveall-container" class=${state}>
                      <button
                          onClick=${() => {
                              set_state("saving")
                              pluto_actions.set_and_run_all_changed_remote_cells()
                          }}
                          class=${cl({ runallchanged: true })}
                          title="Save and run all changed cells"
                      >
                          <b>Save all changes</b> ${is_mac_keyboard ? html`<kbd>⌘ S</kbd>` : html`<kbd>Ctrl</kbd>+<kbd>S</kbd>`}
                      </button>
                  </div>
              `
            : // : state === "saving"
            // ? html` <div id="saveall-container" class=${state}>Saving... <span class="saving-icon"></span></div> `
            state === "saved" || state === "saving"
            ? html` <div id="saveall-container" class=${state}>Saved <span class="saved-icon"></span></div> `
            : null}
    </preamble>`
}
