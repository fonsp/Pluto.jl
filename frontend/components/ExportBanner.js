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

export const ExportBanner = ({ onClose, notebookfile_url, notebookexport_url }) => {
    return html`
        <aside id="export_menu" class="banner_menu">
            <div id="container">
                <div class="export_title">export</div>
                <a href=${notebookfile_url} target="_blank" class="export_card" download>
                    <header><${Triangle} fill="#a270ba" /> Notebook file</header>
                    <section>Download a copy of the <b>.jl</b> script.</section>
                </a>
                <a href=${notebookexport_url} target="_blank" class="export_card" download>
                    <header><${Circle} fill="#E86F51" /> Static HTML</header>
                    <section>An <b>.html</b> file for your web page, or to share online.</section>
                </a>
                <a href="#" class="export_card" onClick=${() => window.print()}>
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
            <button title="Close" class="toggle_export" onClick=${onClose}>
                    <span></span>
                </button>
            </div>
        </aside>
    `
}



export const SaveBanner = ({ onClose }) => {
    return html`
        <aside id="save_menu" class="banner_menu">
            <div id="container">
            <div id="grid">
            <span>Filename:</span>
            <div><input /></div>
            <span>Folder:</span>
            <div><input /></div>
            </div>
                
                <button title="Close" class="toggle_export" onClick=${onClose}>
                    <span></span>
                </button>
            </div>
        </aside>
    `
}
