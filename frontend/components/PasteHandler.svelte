<script>
  import { onMount, onDestroy } from 'svelte'
  import { t } from '../common/lang.js'
  import { link_edit } from './welcome/Open.js'

  export let on_start_navigation = (message, bool) => {}

  // Add a newline in the end for the case user didn't copy it
  // That helps if the user copied up to the last line of the cell order
  function detectNotebook(inputtext) {
    const text = `${inputtext}\n`.replace("\r\n", "\n")
    const from = text.indexOf("### A Pluto.jl notebook ###")
    const cellsfound = text.match(/# ... ........-....-....-....-............/g)
    const cellscount = cellsfound?.length ?? 0
    const cellsorder = text.indexOf("# ╔═╡ Cell order:") + "# ╔═╡ Cell order:".length + 1
    let to = cellsorder
    for (let i = 1; i <= cellscount; i++) {
      to = text.indexOf("\n", to + 1) + 1
    }
    return text.slice(from, to)
  }

  async function readMovedText(movedDataTransferItem) {
    return new Promise((resolve, reject) => {
      try {
        movedDataTransferItem.getAsString((text) => {
          console.log(text)
          resolve(text)
        })
      } catch (ex) {
        reject(ex)
      }
    })
  }

  async function readFile(file) {
    return new Promise((resolve, reject) => {
      const { name, type } = file
      const fr = new FileReader()
      fr.onerror = () => reject("Failed to read file!")
      fr.onloadstart = () => {}
      fr.onprogress = ({ loaded, total }) => {}
      fr.onload = () => {}
      fr.onloadend = () => resolve({ file: fr.result, name, type })
      fr.readAsText(file)
    })
  }

  async function processFile(ev) {
    let notebook
    console.log(ev)
    // Don't do anything if paste on CodeMirror
    const path = ev?.path ?? ev?.composedPath()
    if (path && Array.isArray(path) && path.filter((node) => node?.classList?.contains("cm-editor")).length > 0) {
      return
    }
    switch (ev.type) {
      case "paste":
        notebook = detectNotebook(ev.clipboardData.getData("text/plain"))
        break
      case "dragstart": {
        ev.dataTransfer.dropEffect = "move"
        return
      }
      case "dragover": {
        ev.preventDefault()
        return
      }
      case "drop": {
        ev.preventDefault()
        notebook = ev.dataTransfer.types.includes("Files")
          ? await readFile(ev.dataTransfer.files[0]).then(({ file }) => file)
          : detectNotebook(await readMovedText(ev.dataTransfer.items[0]))
        break
      }
    }
    if (!notebook) {
      // Notebook not found! Doing nothing :)
      return
    }
    on_start_navigation(t("t_loading_something_notebook_from_clipboard"), false)
    document.body.classList.add("loading")
    const response = await fetch("./notebookupload", {
      method: "POST",
      body: notebook,
    })
    if (response.ok) {
      window.location.href = link_edit(await response.text())
    } else {
      let b = await response.blob()
      window.location.href = URL.createObjectURL(b)
    }
  }

  onMount(() => {
    document.addEventListener("paste", processFile)
    document.addEventListener("drop", processFile)
    document.addEventListener("dragstart", processFile)
    document.addEventListener("dragover", processFile)
  })

  onDestroy(() => {
    document.removeEventListener("paste", processFile)
    document.removeEventListener("drop", processFile)
    document.removeEventListener("dragstart", processFile)
    document.removeEventListener("dragover", processFile)
  })
</script>

