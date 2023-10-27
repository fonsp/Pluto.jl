import _ from "../imports/lodash.js"
import { html, useEffect, useState, useRef } from "../imports/Preact.js"
import { time_estimate, usePackageTimingData } from "../common/InstallTimeEstimate.js"

import { useDialog } from "../common/useDialog.js"

export const RunLocalButton = ({ show, start_local }) => {
    //@ts-ignore
    window.open_edit_or_run_popup = () => {
        start_local()
    }

    return html`<div class="edit_or_run">
        <button
            onClick=${(e) => {
                e.stopPropagation()
                e.preventDefault()
                start_local()
            }}
        >
            <b>Edit</b> or <b>run</b> this notebook
        </button>
    </div>`
}

/**
 * @param {{
 *  notebook: import("./Editor.js").NotebookData,
 *  notebookfile: string?,
 *  start_binder: () => Promise<void>,
 *  offer_binder: boolean,
 * }} props
 * */
export const BinderButton = ({ offer_binder, start_binder, notebookfile, notebook }) => {
    const [dialog_ref, openModal, closeModal, toggleModal] = useDialog({ light_dismiss: true })

    const [showCopyPopup, setShowCopyPopup] = useState(false)
    const notebookfile_ref = useRef("")
    notebookfile_ref.current = notebookfile ?? ""

    //@ts-ignore
    window.open_edit_or_run_popup = openModal

    useEffect(() => {
        //@ts-ignore
        // allow user-written JS to start the binder
        window.start_binder = offer_binder ? start_binder : null
        return () => {
            //@ts-ignore
            window.start_binder = null
        }
    }, [start_binder, offer_binder])

    const nbpkg_timingdata = usePackageTimingData()

    const recommend_download = notebookfile_ref.current.startsWith("data:")
    const runtime_str = expected_runtime_str(notebook, nbpkg_timingdata)
    return html`<div class="edit_or_run">
        <button
            onClick=${(e) => {
                toggleModal()
                e.stopPropagation()
                e.preventDefault()
            }}
        >
            <b>Edit</b> or <b>run</b> this notebook
        </button>
        <dialog ref=${dialog_ref} class="binder_help_text">
            <span onClick=${closeModal} class="close"></span>
            ${offer_binder
                ? html`
                      <p style="text-align: center;">
                          ${`To be able to edit code and run cells, you need to run the notebook yourself. `}
                          <b>Where would you like to run the notebook?</b>
                      </p>
                      ${runtime_str == null
                          ? null
                          : html` <div class="expected_runtime_box">${`This notebook takes about `}<span>${runtime_str}</span>${` to run.`}</div>`}
                      <h2 style="margin-top: 3em;">In the cloud <em>(experimental)</em></h2>
                      <div style="padding: 0 2rem;">
                          <button onClick=${start_binder}>
                              <img src="https://cdn.jsdelivr.net/gh/jupyterhub/binderhub@0.2.0/binderhub/static/logo.svg" height="30" alt="binder" />
                          </button>
                      </div>
                      <p style="opacity: .5; margin: 20px 10px;">
                          <a target="_blank" href="https://mybinder.org/">Binder</a> is a free, open source service that runs scientific notebooks in the cloud!
                          It will take a while, usually 2-7 minutes to get a session.
                      </p>
                      <h2 style="margin-top: 4em;">On your computer</h2>
                      <p style="opacity: .5;">(Recommended if you want to store your changes.)</p>
                  `
                : null}
            <ol style="padding: 0 2rem;">
                <li>
                    <div>
                        ${recommend_download
                            ? html`
                                  <div class="command">Download the notebook:</div>
                                  <div
                                      onClick=${(e) => {
                                          e.target.tagName === "A" || e.target.closest("div").firstElementChild.click()
                                      }}
                                      class="download_div"
                                  >
                                      <a href=${notebookfile_ref.current} target="_blank" download="notebook.jl">notebook.jl</a>
                                      <span class="download_icon"></span>
                                  </div>
                              `
                            : html`
                                  <div class="command">Copy the notebook URL:</div>
                                  <div class="copy_div">
                                      <input onClick=${(e) => e.target.select()} value=${notebookfile_ref.current} readonly />
                                      <span
                                          class=${`copy_icon ${showCopyPopup ? "success_copy" : ""}`}
                                          onClick=${async () => {
                                              await navigator.clipboard.writeText(notebookfile_ref.current)
                                              setShowCopyPopup(true)
                                              setTimeout(() => setShowCopyPopup(false), 3000)
                                          }}
                                      />
                                  </div>
                              `}
                    </div>
                </li>
                <li>
                    <div class="command">Run Pluto</div>
                    <p>
                        ${"(Also see: "}
                        <a target="_blank" href="https://computationalthinking.mit.edu/Spring21/installation/">How to install Julia and Pluto</a>)
                    </p>
                    <img src="https://user-images.githubusercontent.com/6933510/107865594-60864b00-6e68-11eb-9625-2d11fd608e7b.png" />
                </li>
                <li>
                    ${recommend_download
                        ? html`
                              <div class="command">Open the notebook file</div>
                              <p>Type the saved filename in the <em>open</em> box.</p>
                              <img src="https://user-images.githubusercontent.com/6933510/119374043-65556900-bcb9-11eb-9026-149c1ba2d05b.png" />
                          `
                        : html`
                              <div class="command">Paste URL in the <em>Open</em> box</div>
                              <video playsinline autoplay loop src="https://i.imgur.com/wf60p5c.mp4" />
                          `}
                </li>
            </ol>
        </dialog>
    </div>`
}

let find_imported_package_names = (/** @type {import("./Editor.js").NotebookData} */ notebook) =>
    _.uniq(
        Object.values(notebook.cell_inputs).flatMap((input) => {
            let { code } = input
            // import A, B, C
            const re = /(using|import)(\s*\w+(\.\w+)*)(\s*\,\s*\w+(\.\w+)*)*/g

            return Array.from(code.matchAll(re)).flatMap((import_match) => {
                const inner = import_match[0].substring(import_match[1].length)

                // find the package name, e.g. `Plot` for `Plot.Extras.coolplot`
                const inner_re = /(\w+)(\.\w+)*/g
                return [...inner.matchAll(inner_re)].map((m) => m[1])
            })
        })
    )

const expected_runtime = (
    /** @type {import("./Editor.js").NotebookData} */ notebook,
    /** @type {import("../common/InstallTimeEstimate.js").PackageTimingData?} */ nbpkg_timingdata
) => {
    let nbpkg_measured = (notebook.nbpkg?.install_time_ns ?? NaN) / 1e9

    let used_packages = notebook.nbpkg?.installed_versions == null ? find_imported_package_names(notebook) : Object.keys(notebook.nbpkg.installed_versions)
    let nbpkg_estimate_data = nbpkg_timingdata == null ? null : time_estimate(nbpkg_timingdata, used_packages)
    let nbpkg_estimate = nbpkg_estimate_data == null ? NaN : nbpkg_estimate_data.install + nbpkg_estimate_data.precompile // no load because that is included in cell runtimes

    let nbpkg_best_guess = _.isNaN(nbpkg_measured) ? nbpkg_estimate : _.isNaN(nbpkg_estimate) ? nbpkg_measured : Math.max(nbpkg_measured, nbpkg_estimate)

    let total_cell_runtime = _.sum(Object.values(notebook.cell_results).map((c) => c.runtime ?? 0)) / 1e9

    return {
        nbpkg_measured,
        nbpkg_estimate,
        nbpkg: nbpkg_best_guess,
        total_cell_runtime,
    }
}

const runtime_overhead = 10 // seconds
const runtime_multiplier = 1.5

const expected_runtime_str = (
    /** @type {import("./Editor.js").NotebookData} */ notebook,
    /** @type {import("../common/InstallTimeEstimate.js").PackageTimingData?} */ nbpkg_timingdata
) => {
    const ex = expected_runtime(notebook, nbpkg_timingdata)
    console.log("runtime estimate", ex)
    if (isNaN(ex.nbpkg)) {
        return null
    }

    const sec = _.round(runtime_overhead + ex.nbpkg + ex.total_cell_runtime * runtime_multiplier, -1)
    return pretty_long_time(sec)
}

export const pretty_long_time = (/** @type {number} */ sec) => {
    const min = sec / 60
    const sec_r = Math.ceil(sec)
    const min_r = Math.round(min)

    if (sec < 60) {
        return `${sec_r} second${sec_r > 1 ? "s" : ""}`
    } else {
        return `${min_r} minute${min_r > 1 ? "s" : ""}`
    }
}
