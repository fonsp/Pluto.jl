const CDNified = (version, file) => `https://cdn.jsdelivr.net/gh/fonsp/Pluto.jl@${version.substr(1)}/frontend/${file}`

export const offline_html = ({ pluto_version, body, head }) => {
    Array.from(body.querySelectorAll(".CodeMirror-sizer")).forEach((s) => (s.style.minHeight = "24px"))

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

    return Promise.all(blob_to_base64_promises)
        .then(() => {
            return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width" />
                <title>⚡ Pluto.jl ⚡</title>
                <meta charset="utf-8" />

                <link rel="stylesheet" href="${CDNified(pluto_version, "editor.css")}" type="text/css" />
                <link rel="stylesheet" href="${CDNified(pluto_version, "treeview.css")}" type="text/css" />
                <link rel="stylesheet" href="${CDNified(pluto_version, "hide-ui.css")}" type="text/css" />
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/codemirror@5.57.0/lib/codemirror.min.css" type="text/css" />

                <script src="${CDNified(pluto_version, "treeview.js")}"></script>

                ${head.querySelector("style#MJX-SVG-styles").outerHTML}
            </head>
            <body>
                ${body.querySelector("main").outerHTML}
                ${body.querySelector("svg#MJX-SVG-global-cache").outerHTML}
            </body>
        </html>`
        })
        .catch((error) => {
            let message =
                "Whoops, failed to export to HTML 😢\nWe would really like to hear from you! Please go to https://github.com/fonsp/Pluto.jl/issues to report this failure:\n\n"
            console.error(message)
            console.error(error)
            alert(message + error)
            return null
        })
}
