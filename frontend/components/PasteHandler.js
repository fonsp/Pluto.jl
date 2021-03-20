import { html, useEffect, useContext } from "../imports/Preact.js"
import { PlutoContext } from "../common/PlutoContext.js"
const localStorageKey = "notebookFile"

export const initializeFromPaste = (pluto_actions) => {
    // run this once
    console.log("Initializing from paste!")
    if (!localStorage[localStorageKey] || !pluto_actions) return

    console.log("Initializing from paste! (actually)")
    const pastedNotebook = JSON.parse(localStorage[localStorageKey])
    localStorage.removeItem(localStorageKey)
    const cell_inputs = pastedNotebook.cells
    const cell_order = pastedNotebook.order
    pluto_actions.update_notebook((notebook) => {
        notebook.cell_inputs = cell_inputs
        notebook.cell_order = cell_order
    })
}

export const PasteConsumer = () => {
    const pluto_actions = useContext(PlutoContext)
    console.log(pluto_actions)
    useEffect(() => {
        if (pluto_actions) setTimeout(() => initializeFromPaste(pluto_actions), 2000)
    }, [pluto_actions])
    return html`<span />`
}

const detectNotebook = (text) => {
    const all = text.split("# ╔═╡ ")
    const cells = all
        .slice(0, all.length - 1)
        .map((s) => s.match(/(........-....-....-....-............)([\s\S]*)/)?.map((s) => s.trim()))
        .filter((s) => s)
        .map(([all, cell_id, code]) => ({ [cell_id]: { code, code_folded: false, cell_id } }))
        .reduce((p, c) => Object.assign(p, c), {})
    const order = all[all.length - 1].match(/(........-....-....-....-............)/g).filter((t) => t)
    console.log(text, all, cells, order)
    return {
        cells,
        order,
    }
}

const readFile = (file) =>
    new Promise((resolve, reject) => {
        const { name, type } = file
        const fr = new FileReader()
        fr.onerror = () => reject("Failed to read file!")
        fr.onloadstart = () => {}
        fr.onprogress = ({ loaded, total }) => {}
        fr.onload = () => {}
        fr.onloadend = ({ target: { result } }) => resolve({ file: result, name, type })
        fr.readAsText(file)
    })

const processFile = async (ev) => {
    let notebook
    switch (ev.type) {
        case "paste":
            notebook = detectNotebook(ev.clipboardData.getData("text/plain"))
            break
        case "drop": {
            if (!ev.dataTransfer.types.includes("Files")) return
            const file = await readFile(ev.dataTransfer.files[0]).then(({ file }) => file)
            notebook = detectNotebook(file)
            break
        }
    }
    if (!notebook) {
        alert("Notebook not found 😥😥")
        return
    }
    console.log("writing file")
    localStorage.setItem(localStorageKey, JSON.stringify(notebook))
    window.location.href = "/new"
}

export const PasteHandler = () => {
    console.log("pasting...")
    useEffect(() => {
        document.addEventListener("paste", processFile)
        document.addEventListener("drop", processFile)
        return () => {
            document.removeEventListener("paste", processFile)
            document.removeEventListener("drop", processFile)
        }
    })

    return html`<span>paste</span>`
}
