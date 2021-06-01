import { html, useState, useRef, useLayoutEffect, useEffect, useMemo, useContext } from "../imports/Preact.js"
import immer from "../imports/immer.js"
import observablehq from "../common/SetupCellEnvironment.js"
import { cl } from "../common/ClassTable.js"

import { RawHTMLContainer, highlight } from "./CellOutput.js"
import { PlutoContext } from "../common/PlutoContext.js"
import { package_status, nbpkg_fingerprint_without_terminal } from "./PkgStatusMark.js"
import { PkgTerminalView } from "./PkgTerminalView.js"

export const PkgPopup = ({ notebook }) => {
    let pluto_actions = useContext(PlutoContext)

    const [recent_event, set_recent_event] = useState(null)
    const [pkg_status, set_pkg_status] = useState(null)
    const pos_ref = useRef("")

    const open = (e) => {
        const el = e.detail.status_mark_element

        pos_ref.current = `top: ${el.getBoundingClientRect().top - document.body.getBoundingClientRect().top}px; left: ${
            el.getBoundingClientRect().left - document.body.getBoundingClientRect().left
        }px;`
        set_recent_event(e.detail)
    }

    useEffect(() => {
        const onpointerdown = (e) => {
            if (e.target?.closest("pkg-popup") == null && e.target?.closest("pkg-status-mark") == null) {
                set_recent_event(null)
            }
        }
        const onkeydown = (e) => {
            if (e.key === "Escape") {
                set_recent_event(null)
            }
        }
        window.addEventListener("open nbpkg popup", open)
        window.addEventListener("pointerdown", onpointerdown)
        document.addEventListener("keydown", onkeydown)

        return () => {
            window.removeEventListener("open nbpkg popup", open)
            window.removeEventListener("pointerdown", onpointerdown)
            document.removeEventListener("keydown", onkeydown)
        }
    }, [])

    useEffect(() => {
        let still_valid = true
        if (recent_event == null) {
            set_pkg_status(null)
        } else {
            ;(pluto_actions.get_avaible_versions({ package_name: recent_event.package_name, notebook_id: notebook.notebook_id }) ?? Promise.resolve([])).then(
                (versions) => {
                    if (still_valid) {
                        set_pkg_status(package_status({ nbpkg: notebook.nbpkg, package_name: recent_event.package_name, available_versions: versions }))
                    }
                }
            )
        }
        return () => {
            still_valid = false
        }
    }, [recent_event, ...nbpkg_fingerprint_without_terminal(notebook.nbpkg)])

    // <header>${recent_event?.package_name}</header>
    return html`<pkg-popup
        class=${cl({
            visible: recent_event != null,
        })}
        style="${pos_ref.current}"
    >
        ${pkg_status?.hint ?? "Loading..."}
        <a class="help" target="_blank" href="https://fonsp.com"
            ><img alt="i" src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.0.0/src/svg/information-circle-outline.svg" width="17"
        /></a>
        <${PkgTerminalView} value=${notebook.nbpkg?.terminal_outputs == null ? null : notebook.nbpkg?.terminal_outputs[recent_event?.package_name]} />
    </pkg-popup>`
}
