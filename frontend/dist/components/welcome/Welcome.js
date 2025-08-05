"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Welcome = void 0;
const lodash_js_1 = __importDefault(require("../../imports/lodash.js"));
const Preact_js_1 = require("../../imports/Preact.js");
const preact = __importStar(require("../../imports/Preact.js"));
const PlutoConnection_js_1 = require("../../common/PlutoConnection.js");
const NewUpdateMessage_js_1 = require("../../common/NewUpdateMessage.js");
const Open_js_1 = require("./Open.js");
const Recent_js_1 = require("./Recent.js");
const Featured_js_1 = require("./Featured.js");
const Environment_js_1 = require("../../common/Environment.js");
const featured_sources_js_1 = __importDefault(require("../../featured_sources.js"));
// This is imported asynchronously - uncomment for development
// import environment from "../../common/Environment.js"
/**
 * @typedef NotebookListEntry
 * @type {{
 *  notebook_id: string,
 *  path: string,
 *  in_temp_dir: boolean,
 *  shortpath: string,
 *  process_status: string,
 * }}
 */
/**
 * @typedef LaunchParameters
 * @type {{
 * pluto_server_url: string?,
 * featured_direct_html_links: boolean,
 * featured_sources: import("./Featured.js").FeaturedSource[]?,
 * featured_source_url?: string,
 * featured_source_integrity?: string,
 * }}
 */
// We use a link from the head instead of directing linking "img/logo.svg" because parcel does not bundle preact files
const url_logo_big = document.head.querySelector("link[rel='pluto-logo-big']")?.getAttribute("href") ?? "";
/**
 * @param {{
 * launch_params: LaunchParameters,
 * }} props
 */
const Welcome = ({ launch_params }) => {
    const [remote_notebooks, set_remote_notebooks] = (0, Preact_js_1.useState)(/** @type {Array<NotebookListEntry>} */ ([]));
    const [connected, set_connected] = (0, Preact_js_1.useState)(false);
    const [extended_components, set_extended_components] = (0, Preact_js_1.useState)({
        show_samples: true,
        CustomPicker: null,
        CustomRecent: null,
    });
    const client_ref = (0, Preact_js_1.useRef)(/** @type {import('../../common/PlutoConnection').PlutoConnection} */ ({}));
    (0, Preact_js_1.useEffect)(() => {
        const on_update = ({ message, type }) => {
            if (type === "notebook_list") {
                // a notebook list updates happened while the welcome screen is open, because a notebook started running for example
                set_remote_notebooks(message.notebooks);
            }
        };
        const on_connection_status = set_connected;
        const client_promise = (0, PlutoConnection_js_1.create_pluto_connection)({
            on_unrequested_update: on_update,
            on_connection_status: on_connection_status,
            on_reconnect: async () => true,
            ws_address: launch_params.pluto_server_url ? (0, PlutoConnection_js_1.ws_address_from_base)(launch_params.pluto_server_url) : undefined,
        });
        client_promise.then(async (client) => {
            Object.assign(client_ref.current, client);
            set_connected(true);
            try {
                const environment = await (0, Environment_js_1.get_environment)(client);
                const { custom_recent, custom_filepicker, show_samples = true } = environment({ client, editor: this, imports: { preact } });
                set_extended_components((old) => ({
                    ...old,
                    CustomRecent: custom_recent,
                    CustomPicker: custom_filepicker,
                    show_samples,
                }));
            }
            catch (e) { }
            (0, NewUpdateMessage_js_1.new_update_message)(client);
            // to start JIT'ting
            client.send("current_time");
            client.send("completepath", { query: "" }, {});
        });
    }, []);
    const { show_samples, CustomRecent, CustomPicker } = extended_components;
    // When block_screen_with_this_text is null (default), all is fine. When it is a string, we show a big banner with that text, and disable all other UI. https://github.com/fonsp/Pluto.jl/pull/2292
    const [block_screen_with_this_text, set_block_screen_with_this_text] = (0, Preact_js_1.useState)(/** @type {string?} */ (null));
    const on_start_navigation = (value, expect_navigation = true) => {
        if (expect_navigation) {
            // Instead of calling set_block_screen_with_this_text(value) directly, we wait for the beforeunload to happen, and then we do it. If this event does not happen within 1 second, then that means that the user right-clicked, or Ctrl+Clicked (to open in a new tab), and we don't want to clear the main menu. https://github.com/fonsp/Pluto.jl/issues/2301
            const handler = (e) => {
                set_block_screen_with_this_text(value);
            };
            window.addEventListener("beforeunload", handler);
            setTimeout(() => window.removeEventListener("beforeunload", handler), 1000);
        }
        else {
            set_block_screen_with_this_text(value);
        }
    };
    /**
     * These are the sources from which we will download the featured notebook titles and metadata.
     * @type {import("./Featured.js").FeaturedSource[]}
     */
    const featured_sources = preact.useMemo(() => 
    // Option 1: configured directly
    launch_params.featured_sources ??
        // Option 2: configured through url and integrity strings
        (launch_params.featured_source_url
            ? [{ url: launch_params.featured_source_url, integrity: launch_params.featured_source_integrity }]
            : // Option 3: default
                featured_sources_js_1.default.sources), [launch_params]);
    if (block_screen_with_this_text != null) {
        return (0, Preact_js_1.html) `
            <div class="navigating-away-banner">
                <h2>Loading ${block_screen_with_this_text}...</h2>
            </div>
        `;
    }
    return (0, Preact_js_1.html) `
        <section id="title">
            <h1>welcome to <img src=${url_logo_big} /></h1>
        </section>
        <section id="mywork">
            <div>
                <${Recent_js_1.Recent}
                    client=${client_ref.current}
                    connected=${connected}
                    remote_notebooks=${remote_notebooks}
                    CustomRecent=${CustomRecent}
                    on_start_navigation=${on_start_navigation}
                />
            </div>
        </section>
        <section id="open">
            <div>
                <${Open_js_1.Open}
                    client=${client_ref.current}
                    connected=${connected}
                    CustomPicker=${CustomPicker}
                    show_samples=${show_samples}
                    on_start_navigation=${on_start_navigation}
                />
            </div>
        </section>
        <section id="featured">
            <div>
                <${Featured_js_1.Featured} sources=${featured_sources} direct_html_links=${launch_params.featured_direct_html_links} />
            </div>
        </section>
    `;
};
exports.Welcome = Welcome;
