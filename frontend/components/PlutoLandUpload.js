import { html, useState } from "../imports/Preact.js"
import _ from "../imports/lodash.js"

//@ts-ignore
import { useDialog } from "../common/useDialog.js"
import { useEventListener } from "../common/useEventListener.js"
import { t } from "../common/lang.js"
import { exportNotebookDesktop, WarnForVisisblePasswords } from "./ExportBanner.js"

/**
 * @param {{
 *  notebook_id: String,
 *  notebookexport_url: String,
 * }} props
 * */
export const PlutoLandUpload = ({ notebook_id, notebookexport_url }) => {
    const [dialog_ref, open, close, _toggle] = useDialog()
    useEventListener(window, "open pluto html export", open, [open])

    const [plutoland_state, set_plutoland_state] = useState("waiting")
    const [plutoland_data, set_plutoland_data] = useState(/** @type Record<string, unknown> */ ({}))

    const [upload_progress, set_upload_progress] = useState(0)

    const on_plutoland_upload = async () => {
        try {
            set_plutoland_state("generating")
            set_upload_progress(0)

            const notebook_response = await fetch(notebookexport_url)
            const notebook_blob = await notebook_response.blob()

            set_plutoland_state("uploading")
            set_upload_progress(0.2)
            const response = await upload_to_plutoland(notebook_blob, (progress) => {
                set_upload_progress(0.2 + progress * 0.8)
            })

            console.log(response)

            if (response.status === 200) {
                const data = JSON.parse(response.response)
                console.log(data)
                set_plutoland_data(data)
                set_plutoland_state("success")
            } else {
                set_plutoland_state("error: Upload failed")
            }
        } catch (error) {
            set_plutoland_state("error: " + error)
        }
    }

    const prog = html`<progress class="ple-plutoland-progress" max="100" value=${upload_progress}>${Math.round(upload_progress * 100)}%</progress>`

    return html`<dialog ref=${dialog_ref} class="export-html-dialog">
        <div class="ple-download ple-option">
            <p>Save the HTML export file to your disk.</p>
            <div class="ple-bigbutton-container">
                <a
                    class="ple-bigbutton"
                    href=${notebookexport_url}
                    target="_blank"
                    download=""
                    onClick=${(e) => {
                        exportNotebookDesktop(e, 1, notebook_id)
                        close()
                    }}
                >
                    Download HTML file ${InlineIonicon("download-outline")}
                </a>
            </div>
        </div>
        <div class="ple-or">--- or ---</div>
        <div class="ple-plutoland ple-option">
            <p>Upload this notebook to <a href="https://pluto.land" target="_blank">pluto.land</a>, a free hosting service for Pluto notebooks.</p>
            <div class="ple-bigbutton-container">
                ${plutoland_state === "waiting"
                    ? html`
                          <a
                              class="ple-bigbutton"
                              href="https://pluto.land/"
                              target="_blank"
                              download=""
                              onClick=${(e) => {
                                  e.preventDefault()
                                  on_plutoland_upload()
                              }}
                          >
                              Upload to <strong>pluto.land</strong> ${InlineIonicon("cloud-upload-outline")}
                          </a>
                      `
                    : plutoland_state === "uploading"
                    ? html` <div class="ple-plutoland-phase">
                          <p>Uploading...</p>
                          ${prog}
                      </div>`
                    : plutoland_state === "generating"
                    ? html` <div class="ple-plutoland-phase">
                          <p>Generating...</p>
                          ${prog}
                      </div>`
                    : plutoland_state === "success"
                    ? html` <div class="ple-plutoland-phase">
                          <p>Uploaded! View your notebook at:</p>
                          <div class="ple-plutoland-url-container">
                              <a href=${`https://pluto.land/n/${plutoland_data.id}`} target="_blank" class="ple-plutoland-url">
                                  ${`https://pluto.land/n/${plutoland_data.id}`}
                              </a>
                              <a
                                  href="#"
                                  title="Delete permanently from pluto.land"
                                  onClick=${async (e) => {
                                      e.preventDefault()

                                      await fetch(`https://pluto.land/n/${plutoland_data.id}`, {
                                          method: "DELETE",
                                          headers: {
                                              "X-Creation-Secret": String(plutoland_data.creation_secret),
                                          },
                                      })
                                      set_plutoland_state("waiting")
                                      set_plutoland_data({})
                                  }}
                              >
                                  ${InlineIonicon("trash-bin-outline")}
                              </a>
                          </div>
                      </div>`
                    : html` <div class="ple-plutoland-phase">Error: ${plutoland_state}</div>`}
            </div>
        </div>
        <div class="final"><button onClick=${close}>${t("t_frontmatter_cancel")}</button></div>
    </dialog>`
}

export const InlineIonicon = (icon_name) => {
    return html`<span class="ionicon-icon" data-icon=${icon_name} data-inline="true"></span>`
}

// Transfer file data to the pluto.land API
/** @returns {Promise<XMLHttpRequest>} */
const upload_to_plutoland = (/** @type {File | Blob} */ filesource, onprogress = (val, xhr) => {}) =>
    new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest()

        xhr.onload = function (e) {
            console.log("done", e, xhr)
            onprogress(1.0, xhr)

            resolve(xhr)
        }

        xhr.onerror = reject
        xhr.onabort = reject

        xhr.open("POST", "https://pluto.land/n", true)

        xhr.upload.onprogress = function (e) {
            console.log("progress", e, xhr)
            let progress = e.loaded / e.total
            onprogress(progress, xhr)
        }
        let data = new FormData()
        data.append("file0", filesource)
        xhr.send(data)
    })
