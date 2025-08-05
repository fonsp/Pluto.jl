"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.link_edit = exports.link_open_url = exports.link_open_path = exports.Open = void 0;
const lodash_js_1 = __importDefault(require("../../imports/lodash.js"));
const Preact_js_1 = require("../../imports/Preact.js");
const FilePicker_js_1 = require("../FilePicker.js");
const PasteHandler_js_1 = require("../PasteHandler.js");
const NotebookLocationFromURL_js_1 = require("../../common/NotebookLocationFromURL.js");
/**
 * @param {{
 *  client: import("../../common/PlutoConnection.js").PlutoConnection?,
 *  connected: Boolean,
 *  show_samples: Boolean,
 *  CustomPicker: {text: String, placeholder: String}?,
 *  on_start_navigation: (string) => void,
 * }} props
 */
const Open = ({ client, connected, CustomPicker, show_samples, on_start_navigation }) => {
    const on_open_path = async (new_path) => {
        const processed = await (0, NotebookLocationFromURL_js_1.guess_notebook_location)(new_path);
        on_start_navigation(processed.path_or_url);
        window.location.href = (processed.type === "path" ? exports.link_open_path : exports.link_open_url)(processed.path_or_url);
    };
    const desktop_on_open_path = async (_p) => {
        window.plutoDesktop?.fileSystem.openNotebook("path");
    };
    const desktop_on_open_url = async (url) => {
        window.plutoDesktop?.fileSystem.openNotebook("url", url);
    };
    const picker = CustomPicker ?? {
        text: "Open a notebook",
        placeholder: "Enter path or URL...",
    };
    return (0, Preact_js_1.html) `<${PasteHandler_js_1.PasteHandler} on_start_navigation=${on_start_navigation} />
        <h2>${picker.text}</h2>
        <div id="new" class=${!!window.plutoDesktop ? "desktop_opener" : ""}>
            <${FilePicker_js_1.FilePicker}
                key=${picker.placeholder}
                client=${client}
                value=""
                on_submit=${on_open_path}
                on_desktop_submit=${desktop_on_open_path}
                clear_on_blur=${false}
                button_label=${window.plutoDesktop ? "Open File" : "Open"}
                placeholder=${picker.placeholder}
            />
            ${window.plutoDesktop != null
        ? (0, Preact_js_1.html) `<${FilePicker_js_1.FilePicker}
                      key=${picker.placeholder}
                      client=${client}
                      value=""
                      on_desktop_submit=${desktop_on_open_url}
                      button_label="Open from URL"
                      placeholder=${picker.placeholder}
                  />`
        : null}
        </div>`;
};
exports.Open = Open;
const link_open_path = (path, execution_allowed = false) => "open?" + new URLSearchParams({ path: path }).toString();
exports.link_open_path = link_open_path;
const link_open_url = (url) => "open?" + new URLSearchParams({ url: url }).toString();
exports.link_open_url = link_open_url;
const link_edit = (notebook_id) => "edit?id=" + notebook_id;
exports.link_edit = link_edit;
