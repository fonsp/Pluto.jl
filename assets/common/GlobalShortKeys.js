document.addEventListener("keydown", (e) => {
    switch (e.keyCode) {
        case 81: // q
            if (e.ctrlKey) {
                if (document.querySelector("notebook>cell.running")) {
                    requestinterrupt()
                }
                e.preventDefault()
            }
            break
        case 82: // r
            if (e.ctrlKey) {
                if (notebook) {
                    document.location.href = "open?path=" + encodeURIComponent(notebook.path)
                    e.preventDefault()
                }
            }
            break
        case 83: // s
            if (e.ctrlKey) {
                window.filePickerCodeMirror.focus()
                window.filePickerCodeMirror.setSelection({ line: 0, ch: 0 }, { line: Infinity, ch: Infinity })
                e.preventDefault()
            }
            break
        case 191: // ? or /
            if (!(e.ctrlKey && e.shiftKey)) {
                break
            }
        // fall into:
        case 112: // F1
            // TODO: show help
            alert(
                `Shortcuts 🎹

Ctrl+Enter:   run cell
Shift+Enter:   run cell and add cell below
Ctrl+Shift+Delete:   delete cell
Ctrl+Q:   interrupt notebook
Ctrl+S:   rename notebook`)

            e.preventDefault()
            break
    }
})