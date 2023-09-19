import _ from "../imports/lodash.js"
import { createSilentAudio, create_recorder } from "../common/AudioRecording.js"
import { html, useEffect, useState, useRef, useCallback, useLayoutEffect, useMemo } from "../imports/Preact.js"
import { AudioPlayer } from "./AudioPlayer.js"
import immer from "../imports/immer.js"
import { base64_arraybuffer, blob_url_to_data_url } from "../common/PlutoHash.js"
import { pack, unpack } from "../common/MsgPack.js"
import { open_pluto_popup } from "./Popup.js"

export const SafePreviewUI = ({ process_waiting_for_permission, risky_file_source, restart, warn_about_untrusted_code }) => {
    return html`
        <div class="outline-frame safe-preview"></div>
        ${process_waiting_for_permission
            ? html`<div class="outline-frame-actions-container safe-preview">
                  <div class="safe-preview-info">
                      <span
                          >Safe preview
                          <button
                              onclick=${(e) => {
                                  open_pluto_popup({
                                      type: "info",
                                      big: true,
                                      body: html`
                                          <h1>Safe preview</h1>
                                          <p>You are reading and editing this file without running Julia code.</p>

                                          <p>
                                              ${`When you are ready, you can `}<a
                                                  href="#"
                                                  onClick=${(e) => {
                                                      e.preventDefault()
                                                      restart(true)
                                                      window.dispatchEvent(new CustomEvent("close pluto popup"))
                                                  }}
                                                  >run this notebook</a
                                              >.
                                          </p>
                                          ${warn_about_untrusted_code
                                              ? html`
                                                    <pluto-output class="rich_output"
                                                        ><div class="markdown">
                                                            <div class="admonition warning">
                                                                <p class="admonition-title">Warning</p>
                                                                <p>Are you sure that you trust this file?</p>
                                                                ${risky_file_source == null ? null : html`<p><code>${risky_file_source}</code></pre>`}
                                                                <p>A malicious notebook can steal passwords and data.</p>
                                                            </div>
                                                        </div></pluto-output
                                                    >
                                                `
                                              : null}
                                      `,
                                  })
                              }}
                          >
                              <span><span class="info-icon pluto-icon"></span></span>
                          </button>
                      </span>
                  </div>
              </div>`
            : null}
    `
}

export const SafePreviewOutput = () => {
    return html`<pluto-output class="rich_output"
        ><div class="safe-preview-output">
            <span class="info-icon pluto-icon"></span><span>${`Code not executed in `}<em>Safe preview</em></span>
        </div></pluto-output
    >`
}
