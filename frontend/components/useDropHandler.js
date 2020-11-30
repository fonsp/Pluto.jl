import { useState, useMemo } from "../imports/Preact.js"

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

export const useDropHandler = (requests, on_change, cell_id) => {
    const [saving_file, set_saving_file] = useState(false)
    const [drag_active, set_drag_active_fast] = useState(false)
    const set_drag_active = useMemo(() => _.debounce(set_drag_active_fast, DEBOUNCE_MAGIC_MS), [set_drag_active_fast])
    const inactive_handler = useMemo(
        () => (ev) => {
            switch (ev.type) {
                case "drop":
                    ev.preventDefault() // don't file open
                    break
                case "dragover":
                    ev.preventDefault()
                    ev.dataTransfer.dropEffect = "none"
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
                    break
            }
        },
        [set_drag_active, set_drag_active_fast]
    )
    const event_handler = useMemo(() => {
        const uploadAndCreateCodeTemplate = async (file) => {
            if (!(file instanceof File)) return " #  File can't be read"
            set_saving_file(true)
            const {
                message: { success, code },
            } = await prepareFile(file).then(
                (preparedObj) => {
                    return requests.write_file(cell_id, preparedObj)
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
            if (ev.dataTransfer.types[0] === "text/pluto-cell") return
            switch (ev.type) {
                case "cmdrop":
                case "drop":
                    ev.preventDefault() // don't file open
                    set_drag_active(false)
                    if (!ev.dataTransfer.files.length) {
                        return
                    }
                    uploadAndCreateCodeTemplate(ev.dataTransfer.files[0]).then((code) => {
                        if (code) {
                            on_change(code)
                            requests.change_remote_cell(cell_id, code)
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
    }, [set_drag_active, set_drag_active_fast, set_saving_file, requests, cell_id, on_change])

    return { saving_file, drag_active, event_handler, inactive_handler }
}
