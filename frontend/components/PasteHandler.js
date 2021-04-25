import { html, useEffect } from "../imports/Preact.js"
import { link_open_path } from "./Welcome.js"

const detectNotebook = (text) => {
    const from = text.indexOf("### A Pluto.jl notebook ###")
    const cellscount = text.match(/# ... ........-....-....-....-............/g)?.length
    const cellsorder = text.indexOf("# ╔═╡ Cell order:") + "# ╔═╡ Cell order:".length + 1
    let i = 0
    let to = cellsorder
    console.log(cellscount)
    while (++i <= cellscount) {
        to = text.indexOf("\n", to + 1) + 1
    }
    return text.slice(from, to)
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
    document.body.classList.add("loading")
    const reply = await fetch("/notebookupload", {
        method: "POST",
        body: notebook,
        cache: "no-cache",
        credentials: "same-origin",
    }).then((res) => res.text())
    window.location.href = link_open_path(reply)
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

    return html`<span />`
}
