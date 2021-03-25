const CDNified = (version, file) => `https://cdn.jsdelivr.net/gh/fonsp/Pluto.jl@${version.substr(1)}/frontend/${file}`

export const offline_html = async ({ pluto_version, body, head }) => {
    for (let iframe of body.querySelectorAll("iframe")) {
        try {
            let html = new XMLSerializer().serializeToString(iframe.contentDocument)
            // let html = iframe.contentDocument.documentElement.outerHTML
            let dataURI = "data:text/html," + encodeURIComponent(html)
            iframe.dataset.datauri = dataURI
        } catch (err) {}
    }

    try {
        const oldBody = body
        body = body.cloneNode(true)
        const oldBodyCMs = oldBody.querySelectorAll("pluto-input .CodeMirror")
        body.querySelectorAll("pluto-input .CodeMirror").forEach((cm, i) => {
            const oldCM = oldBodyCMs[i].CodeMirror
            oldCM.save()
            cm.outerHTML = `<textarea class="init-cm">${oldCM.getTextArea().value}</textarea>`
        })
        for (let iframe of body.querySelectorAll("iframe")) {
            if (iframe.dataset.datauri) {
                iframe.src = iframe.dataset.datauri
                delete iframe.dataset.datauri
            }
        }
        const blob_to_base64_promises = Array.from(body.querySelectorAll("img"))
            .filter((img) => img.src.match(/^blob:/))
            .map(
                (img) =>
                    new Promise(async (resolve) => {
                        const blob = await (await fetch(img.src)).blob()
                        const reader = new FileReader()
                        reader.onload = () => {
                            var data = reader.result
                            img.src = data
                            resolve()
                        }
                        reader.readAsDataURL(blob)
                    })
            )

        await Promise.all(blob_to_base64_promises)

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width" />
                <title>⚡ Pluto.jl ⚡</title>
                <meta charset="utf-8" />

                <link rel="stylesheet" href="${CDNified(pluto_version, "editor.css")}" type="text/css" />
                <link rel="stylesheet" href="${CDNified(pluto_version, "treeview.css")}" type="text/css" />
                <link rel="stylesheet" href="${CDNified(pluto_version, "hide-ui.css")}" type="text/css" />
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/codemirror@5.58.1/lib/codemirror.min.css" type="text/css" />
                <script src="https://cdn.jsdelivr.net/npm/codemirror@5.59.0/lib/codemirror.min.js" defer></script>
                <script src="https://cdn.jsdelivr.net/npm/codemirror@5.58.1/mode/julia/julia.min.js" defer></script>
                <script src="https://cdn.jsdelivr.net/npm/codemirror@5.58.1/addon/mode/loadmode.min.js" defer></script>

                ${head.querySelector("style#MJX-SVG-styles").outerHTML}
            </head>
            <body>
                ${body.querySelector("main").outerHTML}
                ${body.querySelector("svg#MJX-SVG-global-cache").outerHTML}
            </body>
            <script>
                    const cmOptions = {
                        lineNumbers: true,
                        mode: "julia",
                        lineWrapping: true,
                        viewportMargin: Infinity,
                        placeholder: "Enter cell code...",
                        indentWithTabs: true,
                        indentUnit: 4,
                        cursorBlinkRate: -1,
                        readOnly: false,
                    }
                    document.addEventListener("DOMContentLoaded", () =>
                        document.querySelectorAll(".init-cm").forEach(textArea => {
                            CodeMirror.fromTextArea(textArea, cmOptions)
                        })
                    )
            </script>
            </html>
        `
    } catch (error) {
        let message =
            "Whoops, failed to export to HTML 😢\nWe would really like to hear from you! Please go to https://github.com/fonsp/Pluto.jl/issues to report this failure:\n\n"
        console.error(message)
        console.error(error)
        alert(message + error)
        return null
    }
}
