function environment(client, html, useEffect, useState, useMemo) {
    const noop = () => false

    const custom_editor_header_component = ({ notebook_id, new_path }) => {
        const [username, setUsername] = useState(null)
        const [currentNotebookFolder, setCurrentNotebookFolder] = useState("Default")
        const [folders, setFolders] = useState([])

        useEffect(() => {
            client.send("juliahub_initiate").then((response) => {
                setUsername(response.message.username)
                setFolders(response.message.folders)
            })
        }, [client, setUsername, setFolders])

        const onchange = useMemo(
            (selected) => {
                const patch_data = { id: notebook_id, folder: selected, notebook: new_path }
                client.send("juliahub_notebook_patch", patch_data).then((response) => {
                    if (response.success) {
                        console.log("successfully changed notebook folder")
                        setCurrentNotebookFolder(selected)
                    }
                    alert("Error while doing something")
                    return response.message
                })
            },
            [notebook_id, new_path, setCurrentNotebookFolder, client]
        )

        return html`<select id="folder-dropdown" onchange=${onchange}>
            ${folders.map(({ name }) => html`<option selected=${name === currentNotebookFolder} value=${name}>${name}</option>`)}
        </select>`
    }
    return {
        on_editor_mount: noop,
        custom_editor_header_component,
    }
}

export default environment
