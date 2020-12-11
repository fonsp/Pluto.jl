import { html } from "../imports/Preact.js"

import { offline_html } from "../common/OfflineHTMLExport.js"

const Circle = ({ fill }) => html`
    <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        style="
        height: .7em;
        width: .7em;
        margin-left: .3em;
        margin-right: .2em;
    "
    >
        <circle cx="24" cy="24" r="24" fill=${fill}></circle>
    </svg>
`
const Triangle = ({ fill }) => html`
    <svg width="48" height="48" viewBox="0 0 48 48" style="height: .7em; width: .7em; margin-left: .3em; margin-right: .2em; margin-bottom: -.1em;">
        <polygon points="24,0 48,40 0,40" fill=${fill} stroke="none" />
    </svg>
`

export const ExportBanner = ({ notebook, pluto_version, onClose, open }) => {
    // @ts-ignore
    let is_chrome = window.chrome == null

    return html`
        <aside id="export">
            <div id="container">
                <div class="export_title">export</div>
                <a href="./notebookfile?id=${notebook.notebook_id}" target="_blank" class="export_card">
                    <header><${Triangle} fill="#a270ba" /> Notebook file</header>
                    <section>Download a copy of the <b>.jl</b> script.</section>
                </a>
                <a
                    href="#"
                    class="export_card"
                    onClick=${(e) => {
                        offline_html({
                            pluto_version: pluto_version,
                            head: document.head,
                            body: document.body,
                        }).then((html) => {
                            if (html != null) {
                                const fake_anchor = document.createElement("a")
                                fake_anchor.setAttribute("download", `${notebook.shortpath}.html`)
                                fake_anchor.setAttribute(
                                    "href",
                                    URL.createObjectURL(
                                        new Blob([html], {
                                            type: "text/html",
                                        })
                                    )
                                )
                                document.body.appendChild(fake_anchor)
                                setTimeout(() => {
                                    fake_anchor.click()
                                    document.body.removeChild(fake_anchor)
                                }, 100)
                            }
                        })
                    }}
                >
                    <header><${Circle} fill="#E86F51" /> Static HTML</header>
                    <section>An <b>.html</b> file for your web page, or to share online.</section>
                </a>
                <a
                    href="#"
                    class="export_card"
                    style=${!is_chrome ? "opacity: .7;" : ""}
                    onClick=${() => {
                        if (!is_chrome) {
                            alert("PDF generation works best on Google Chome.\n\n(We're working on it!)")
                        }
                        window.print()
                    }}
                >
                    <header><${Circle} fill="#3D6117" /> Static PDF</header>
                    <section>A static <b>.pdf</b> file for print or email.</section>
                </a>
                <!--<div class="export_title">
                future
            </div>
            <a class="export_card" style="border-color: #00000021; opacity: .7;">
                <header>mybinder.org</header>
                <section>Publish an interactive notebook online.</section>
            </a>-->
                <button title="Close" class="toggle_export" onClick=${() => onClose()}>
                    <span></span>
                </button>
            </div>
        </aside>
    `
}
