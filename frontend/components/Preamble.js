import { html, useEffect, useState, useContext, useRef } from "../imports/Preact.js"
import { cl } from "../common/ClassTable.js"
import { PlutoContext } from "../common/PlutoContext.js"
import { is_mac_keyboard } from "../common/KeyboardShortcuts.js"

export const Preamble = ({ any_code_differs, last_update_time, notebook_file_newer }) => {
    let pluto_actions = useContext(PlutoContext)

    const [state, set_state] = useState("")
    const [filestate, set_filestate] = useState("")
    const timeout_ref = useRef(null)

    useEffect(() => {
        clearTimeout(timeout_ref?.current)
        if (any_code_differs) {
            set_state("ask_to_save")
        } else {
            if (Date.now() - last_update_time < 1000) {
                set_state("saved")
                timeout_ref.current = setTimeout(() => {
                    set_state("")
                }, 1000)
            } else {
                set_state("")
            }
        }
        return () => clearTimeout(timeout_ref?.current)
    }, [any_code_differs])

    useEffect(() => {
        if (notebook_file_newer) {
            set_filestate("ask_to_load")
        } else {
            set_filestate("")
        }
    },[notebook_file_newer])

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
                          <span class="only-on-hover"><b>Save all changes</b> </span>${is_mac_keyboard
                              ? html`<kbd>⌘ S</kbd>`
                              : html`<kbd>Ctrl</kbd>+<kbd>S</kbd>`}
                      </button>
                  </div>
              `
            : // : state === "saving"
            // ? html` <div id="saveall-container" class=${state}>Saving... <span class="saving-icon"></span></div> `
            state === "saved" || state === "saving"
            ? html`
                  <div id="saveall-container" class=${state}>
                      <span><span class="only-on-hover">Saved </span><span class="saved-icon"></span></span>
                  </div>
              `
            : null}
            ${filestate === "ask_to_load"
            ? html`
                  <div id="loadnotebook-container" class=${filestate}>
                      <button
                          onClick=${async () => {
                              console.log("loading")
                              set_filestate("loading")
                              await pluto_actions.reload_from_file()
                              console.log("reloaded")
                              set_filestate("")
                          }}
                          title="Load notebook from file"
                      >
                          <span class="only-on-hover"><b>Notebook file has changed, </b> </span><span>Click to Reload</span>
                      </button>
                  </div>
              `
            : null
                }
    </preamble>`
}
