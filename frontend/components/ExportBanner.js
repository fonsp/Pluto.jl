import { html } from "../imports/Preact.js"

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
const Square = ({ fill }) => html`
    <svg width="48" height="48" viewBox="0 0 48 48" style="height: .7em; width: .7em; margin-left: .3em; margin-right: .2em; margin-bottom: -.1em;">
        <polygon points="0,0 0,40 40,40 40,0" fill=${fill} stroke="none" />
    </svg>
`

export const WarnForVisisblePasswords = () => {
    if (
        Array.from(document.querySelectorAll("bond")).some((bond_el) =>
            Array.from(bond_el.querySelectorAll(`input[type="password"]`)).some((input) => {
                // @ts-ignore
                if (input?.value !== "") {
                    input.scrollIntoView()
                    return true
                }
            })
        )
    ) {
        alert(
            "Warning: this notebook includes a password input with something typed in it. The contents of this password field will be included in the exported file in an unsafe way. \n\nClear the password field and export again to avoid this problem."
        )
    }
}

export const ExportBanner = ({ notebook_id, onClose, notebookfile_url, notebookexport_url, start_recording }) => {
    // @ts-ignore
    const isDesktop = !!window.plutoDesktop

    const exportNotebook = (/** @type {{ preventDefault: () => void; }} */ e, /** @type {Desktop.PlutoExport} */ type) => {
        if (isDesktop) {
            e.preventDefault()
            window.plutoDesktop?.fileSystem.exportNotebook(notebook_id, type)
        }
    }

    return html`
        <aside id="export">
            <div id="container">
                <div class="export_title">export</div>
                <!-- no "download" attribute here: we want the jl contents to be shown in a new tab -->
                <a href=${notebookfile_url} target="_blank" class="export_card" onClick=${(e) => exportNotebook(e, 0)}>
                    <header><${Triangle} fill="#a270ba" /> Notebook file</header>
                    <section>Download a copy of the <b>.jl</b> script.</section>
                </a>
                <a
                    href=${notebookexport_url}
                    target="_blank"
                    class="export_card"
                    download=""
                    onClick=${(e) => {
                        WarnForVisisblePasswords()
                        exportNotebook(e, 1)
                    }}
                >
                    <header><${Square} fill="#E86F51" /> Static HTML</header>
                    <section>An <b>.html</b> file for your web page, or to share online.</section>
                </a>
                <a href="#" class="export_card" onClick=${() => window.print()}>
                    <header><${Square} fill="#619b3d" /> PDF</header>
                    <section>A static <b>.pdf</b> file for print or email.</section>
                </a>
                ${html`
                    <div class="export_title">record</div>
                    <a
                        href="#"
                        onClick=${(e) => {
                            WarnForVisisblePasswords()
                            start_recording()
                            onClose()
                            e.preventDefault()
                        }}
                        class="export_card"
                    >
                        <header><${Circle} fill="#E86F51" /> Record <em>(preview)</em></header>
                        <section>Capture the entire notebook, and any changes you make.</section>
                    </a>
                `}
                <div class="export_small_btns">
                    <button
                        title="Edit frontmatter"
                        class="toggle_frontmatter_edit"
                        onClick=${() => {
                            onClose()
                            window.dispatchEvent(new CustomEvent("open pluto frontmatter"))
                        }}
                    >
                        <span></span>
                    </button>
                    <button title="Close" class="toggle_export" onClick=${() => onClose()}>
                        <span></span>
                    </button>
                </div>
            </div>
        </aside>
    `
}
