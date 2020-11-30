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
    const [savingFile, setSavingFile] = useState(false)
    const [dragActive, setDragActiveFast] = useState(false)
    const setDragActive = useMemo(() => _.debounce(setDragActiveFast, DEBOUNCE_MAGIC_MS), [setDragActiveFast])
    const inactiveHandler = useMemo(
        () => (ev) => {
            switch (ev.type) {
                case "drop":
                    ev.preventDefault() // don't file open
                    break
                case "dragover":
                    ev.preventDefault()
                    ev.dataTransfer.dropEffect = "none"
                    setDragActive(true)
                    setTimeout(() => setDragActive(false), MAGIC_TIMEOUT)
                    break
                case "dragenter":
                    setDragActiveFast(true)
                    break
                case "dragleave":
                    setDragActive(false)
                    break
                default:
                    break
            }
        },
        [setDragActive, setDragActiveFast]
    )
    const eventHandler = useMemo(() => {
        const uploadAndCreateCodeTemplate = async (file) => {
            if (!(file instanceof File)) return " #  File can't be read"
            setSavingFile(true)
            const {
                message: { success, code },
            } = await prepareFile(file).then(
                (preparedObj) => {
                    return requests.write_file(cell_id, preparedObj)
                },
                () => alert("Pluto can't save this file 😥")
            )
            setSavingFile(false)
            setDragActiveFast(false)
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
                    setDragActive(false)
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
                    setDragActive(true)
                    setTimeout(() => setDragActive(false), MAGIC_TIMEOUT)
                    break
                case "dragenter":
                    setDragActiveFast(true)
                    break
                case "dragleave":
                    setDragActive(false)
                    break
                default:
            }
        }
    }, [setDragActive, setDragActiveFast, setSavingFile, requests, cell_id, on_change])

    return { savingFile, dragActive, eventHandler, inactiveHandler }
}
