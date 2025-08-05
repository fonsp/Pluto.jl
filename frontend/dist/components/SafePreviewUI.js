"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafePreviewSanitizeMessage = exports.SafePreviewOutput = exports.SafePreviewUI = void 0;
const open_pluto_popup_js_1 = require("../common/open_pluto_popup.js");
const lodash_js_1 = __importDefault(require("../imports/lodash.js"));
const Preact_js_1 = require("../imports/Preact.js");
const SafePreviewUI = ({ process_waiting_for_permission, risky_file_source, restart, warn_about_untrusted_code }) => {
    return (0, Preact_js_1.html) `
        <div class="outline-frame safe-preview"></div>
        ${process_waiting_for_permission
        ? (0, Preact_js_1.html) `<div class="outline-frame-actions-container safe-preview">
                  <div class="safe-preview-info">
                      <span
                          >Safe preview
                          <button
                              onclick=${(e) => {
            (0, open_pluto_popup_js_1.open_pluto_popup)({
                type: "info",
                big: true,
                should_focus: true,
                body: (0, Preact_js_1.html) `
                                          <h1>Safe preview</h1>
                                          <p>You are reading and editing this file without running Julia code.</p>

                                          <p>
                                              ${`When you are ready, you can `}<a
                                                  href="#"
                                                  onClick=${(e) => {
                    e.preventDefault();
                    restart(true);
                    window.dispatchEvent(new CustomEvent("close pluto popup"));
                }}
                                                  >run this notebook</a
                                              >.
                                          </p>
                                          ${warn_about_untrusted_code
                    ? (0, Preact_js_1.html) `
                                                    <pluto-output class="rich_output"
                                                        ><div class="markdown">
                                                            <div class="admonition warning">
                                                                <p class="admonition-title">Warning</p>
                                                                <p>Are you sure that you trust this file?</p>
                                                                ${risky_file_source == null ? null : (0, Preact_js_1.html) `<p><code>${risky_file_source}</code></pre>`}
                                                                <p>A malicious notebook can steal passwords and data.</p>
                                                            </div>
                                                        </div></pluto-output
                                                    >
                                                `
                    : null}
                                      `,
            });
        }}
                          >
                              <span><span class="info-icon pluto-icon"></span></span>
                          </button>
                      </span>
                  </div>
              </div>`
        : null}
    `;
};
exports.SafePreviewUI = SafePreviewUI;
const SafePreviewOutput = () => {
    return (0, Preact_js_1.html) `<pluto-output class="rich_output"
        ><div class="safe-preview-output">
            <span class="offline-icon pluto-icon"></span><span>${`Code not executed in `}<em>Safe preview</em></span>
        </div></pluto-output
    >`;
};
exports.SafePreviewOutput = SafePreviewOutput;
exports.SafePreviewSanitizeMessage = `<div class="safe-preview-output">
<span class="offline-icon pluto-icon"></span><span>${`Scripts and styles not rendered in `}<em>Safe preview</em></span>
</div>`;
