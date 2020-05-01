document.addEventListener("DOMContentLoaded", () => {
    
    /* REMOTE NOTEBOOK LIST */

    window.remoteNotebookList = null

    function updateRemoteNotebooks(list) {
        remoteNotebookList = list
        
        var listEl = document.querySelector("ul.running")
        listEl.innerHTML = ""
        document.body.classList.add("nosessions")
        list.forEach(nb => {
            document.body.classList.remove("nosessions")
            var a = document.createElement("a")
            a.href = "edit?uuid=" + nb.uuid
            a.innerText = nb.shortpath
            
            var li = document.createElement("li")
            li.appendChild(a)

            listEl.appendChild(li)
        })
        console.log(list)
    }

    /* FILE PICKER */

    const openFileButton = document.querySelector("filepicker>button")
    openFileButton.addEventListener("click", openFile)

    function openFile(){
        const path = window.filePickerCodeMirror.getValue()
        window.location.href = "open?path=" + encodeURIComponent(path)
    }

    window.filePickerCodeMirror = createCodeMirrorFilepicker((elt) => {
        document.querySelector("filepicker").insertBefore(
            elt,
            openFileButton)
        }, openFile, () => updateLocalNotebookPath(notebookPath), false)

    

    /* SERVER CONNECTION */

    function onUpdate(update, byMe) {
        var message = update.message

        switch (update.type) {
            case "notebook_list":
                // TODO: catch exception
                updateRemoteNotebooks(message.notebooks)
                break
            default:
                console.error("Received unknown update type!")
                console.error(update)
                break
        }
    }

    function onEstablishConnection(){
        // on socket success
        // TODO: we should when exactly this happens
        client.send("getallnotebooks", {})
        document.body.classList.remove("loading")
    }

    function onReconnect() {
        console.info("connected")
    }

    function onDisconnect() {
        console.info("disconnected")
    }

    window.client = new PlutoConnection(onUpdate, onEstablishConnection, onReconnect, onDisconnect)
    client.initialize()
});

