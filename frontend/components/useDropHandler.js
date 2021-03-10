import { PlutoContext } from "../common/PlutoContext.js"
import { useState, useMemo, useContext } from "../imports/Preact.js"

const MAGIC_TIMEOUT = 500
const DEBOUNCE_MAGIC_MS = 250

const prepareFile = (file) =>
    new Promise((resolve, reject) => {
        const { name, type } = file
        const fr = new FileReader()
        fr.onerror = () => reject("Failed to read file!")
        fr.onloadstart = () => {}
        fr.onprogress = ({ loaded, total }) => {}
        fr.onload = () => {}
        fr.onloadend = ({ target: { result } }) => resolve({ file: result, name, type })
        fr.readAsArrayBuffer(file)
    })

export const useDropHandler = () => {
    let pluto_actions = useContext(PlutoContext)
    const [saving_file, set_saving_file] = useState(false)
    const [drag_active, set_drag_active_fast] = useState(false)
    const set_drag_active = useMemo(() => _.debounce(set_drag_active_fast, DEBOUNCE_MAGIC_MS), [set_drag_active_fast])

    const handler = useMemo(() => {
        const uploadAndCreateCodeTemplate = async (file, drop_cell_id) => {
            if (!(file instanceof File)) return " #  File can't be read"
            set_saving_file(true)
            const {
                message: { success, code },
            } = await prepareFile(file).then(
                (preparedObj) => {
                    return pluto_actions.write_file(drop_cell_id, preparedObj)
                },
                () => alert("Pluto can't save this file 😥")
            )
            set_saving_file(false)
            set_drag_active_fast(false)
            if (!success) {
                alert("Pluto can't save this file 😥")
                return "# File save failed"
            }
            if (code) return code
            alert("Pluto doesn't know what to do with this file 😥. Feel that's wrong? Open an issue!")
            return ""
        }
        return (ev) => {
            // dataTransfer is in Protected Mode here. see type, let Pluto DropRuler handle it.
            // if (ev.dataTransfer.types.includes("text/pluto-cell") || ev.dataTransfer.types[0] === "text/plain") return
            // if (ev.dataTransfer.types.length === 0) return

            // Instead of skipping on `text/pluto-cell` and `text/plain`, lets skip on everything but `Files` (that's the above three lines)
            // https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/types#return_value mentions
            // "If any files are included in the drag operation, then one of the types will be the string `Files`"
            if (!ev.dataTransfer.types.includes("Files")) return

            ev.stopPropagation()
            switch (ev.type) {
                case "cmdrop":
                case "drop":
                    ev.preventDefault() // don't file open
                    const cell_element = (ev.path || ev.composedPath()).find((el) => el.tagName === "PLUTO-CELL")
                    const drop_cell_id = cell_element?.id || document.querySelector("pluto-cell:last-child")?.id
                    const drop_cell_value = cell_element?.querySelector(".CodeMirror")?.CodeMirror?.getValue()
                    const is_empty = drop_cell_value?.length === 0 && !cell_element?.classList?.contains("code_folded")
                    set_drag_active(false)
                    if (ev.dataTransfer.files.length === 0) {
                        return
                    }
                    uploadAndCreateCodeTemplate(ev.dataTransfer.files[0], drop_cell_id).then((code) => {
                        if (code) {
                            if (!is_empty) {
                                pluto_actions.add_remote_cell(drop_cell_id, "after", code)
                            } else {
                                pluto_actions.set_local_cell(drop_cell_id, code, () => pluto_actions.set_and_run_multiple([drop_cell_id]))
                            }
                        }
                    })
                    break
                case "dragover":
                    ev.preventDefault()
                    ev.dataTransfer.dropEffect = "copy"
                    set_drag_active(true)
                    setTimeout(() => set_drag_active(false), MAGIC_TIMEOUT)
                    break
                case "dragenter":
                    set_drag_active_fast(true)
                    break
                case "dragleave":
                    set_drag_active(false)
                    break
                default:
            }
        }
    }, [set_drag_active, set_drag_active_fast, set_saving_file, pluto_actions])
    return { saving_file, drag_active, handler }
}
