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

// TODO
const SquigglyAnimation = ({ fill }) => html``

//@ts-ignore
window.enable_secret_pluto_recording = true

const append_isolated_cells_to_url = (isolated_cells) => {
  let url = new URL(window.location.href);
  isolated_cells.forEach(cell_id => url.searchParams.append('isolated_cell_id', cell_id))
  window.location.href = url
}

export const ExportBanner = ({ onClose, notebookfile_url, isolated_cells, notebookexport_url, start_recording }) => {
    return html`
        <aside id="export">
            <div id="container">
                <div class="export_title">export</div>
                <!-- no "download" attribute here: we want the jl contents to be shown in a new tab -->
                <a href=${notebookfile_url} target="_blank" class="export_card">
                    <header><${Triangle} fill="#a270ba" /> Notebook file</header>
                    <section>Download a copy of the <b>.jl</b> script.</section>
                </a>
                <a href=${notebookexport_url} target="_blank" class="export_card" download="">
                    <header><${Square} fill="#E86F51" /> Static HTML</header>
                    <section>An <b>.html</b> file for your web page, or to share online.</section>
                </a>
                <a href="#" class="export_card" onClick=${() => window.print()}>
                    <header><${Square} fill="#619b3d" /> Static PDF</header>
                    <section>A static <b>.pdf</b> file for print or email.</section>
                </a>
                <a href="#" class="export_card" onClick=${() => append_isolated_cells_to_url(isolated_cells)}>
                    <header><${Square} fill="gold" /> Isolated Cells</header>
                    <section>Open Isolated Cells Layout</section>
                </a>
                ${
                    //@ts-ignore
                    window.enable_secret_pluto_recording
                        ? html`
                              <div class="export_title">record</div>
                              <a
                                  href="#"
                                  onClick=${(e) => {
                                      start_recording()
                                      onClose()
                                      e.preventDefault()
                                  }}
                                  class="export_card"
                              >
                                  <header><${Circle} fill="#E86F51" /> Record <em>(preview)</em></header>
                                  <section>Capture the entire notebook, and any changes you make.</section>
                              </a>
                          `
                        : null
                }
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
