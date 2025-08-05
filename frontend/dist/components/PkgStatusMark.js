"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PkgActivateMark = exports.PkgStatusMark = exports.package_status = exports.nbpkg_fingerprint_without_terminal = exports.nbpkg_fingerprint = void 0;
const open_pluto_popup_js_1 = require("../common/open_pluto_popup.js");
const lodash_js_1 = __importDefault(require("../imports/lodash.js"));
const Preact_js_1 = require("../imports/Preact.js");
const Popup_js_1 = require("./Popup.js");
const nbpkg_fingerprint = (nbpkg) => (nbpkg == null ? [null] : Object.entries(nbpkg).flat());
exports.nbpkg_fingerprint = nbpkg_fingerprint;
const nbpkg_fingerprint_without_terminal = (nbpkg) => nbpkg == null ? [null] : Object.entries(nbpkg).flatMap(([k, v]) => (k === "terminal_outputs" ? [] : [v]));
exports.nbpkg_fingerprint_without_terminal = nbpkg_fingerprint_without_terminal;
const can_update = (installed, available) => {
    if (installed === "stdlib" || !lodash_js_1.default.isArray(available)) {
        return false;
    }
    else {
        // return true
        return lodash_js_1.default.last(available) !== installed;
    }
};
/**
 * @typedef PackageStatus
 * @property {string} status
 * @property {import("../imports/Preact.js").ReactElement} hint
 * @property {string} hint_raw
 * @property {string[]?} available_versions
 * @property {string?} chosen_version
 * @property {string?} package_url
 * @property {boolean} busy
 * @property {boolean} offer_update
 */
/**
 * @param {{
 *  package_name: string,
 *  package_url?: string,
 *  is_disable_pkg: boolean,
 *  available_versions?: string[],
 *  nbpkg: import("./Editor.js").NotebookPkgData?,
 * }} props
 * @returns {PackageStatus}
 */
const package_status = ({ nbpkg, package_name, available_versions, is_disable_pkg, package_url }) => {
    let status = "error";
    let hint_raw = "error";
    let hint = (0, Preact_js_1.html) `error`;
    let offer_update = false;
    package_url = package_url ?? `https://juliahub.com/ui/Packages/General/${package_name}`;
    const chosen_version = nbpkg?.installed_versions[package_name] ?? null;
    const nbpkg_waiting_for_permission = nbpkg?.waiting_for_permission ?? false;
    const busy = !nbpkg_waiting_for_permission && ((nbpkg?.busy_packages ?? []).includes(package_name) || !(nbpkg?.instantiated ?? true));
    const package_name_pretty = (0, Preact_js_1.html) `<a class="package-name" href=${package_url}><b>${package_name}</b></a> `;
    if (is_disable_pkg) {
        const f_name = package_name;
        status = "disable_pkg";
        hint_raw = `${f_name} disables Pluto's built-in package manager.`;
        hint = (0, Preact_js_1.html) `<b>${f_name}</b> disables Pluto's built-in package manager.`;
    }
    else if (chosen_version != null || lodash_js_1.default.isEqual(available_versions, ["stdlib"])) {
        if (chosen_version == null || chosen_version === "stdlib") {
            status = "installed";
            hint_raw = `${package_name} is part of Julia's pre-installed 'standard library'.`;
            hint = (0, Preact_js_1.html) `${package_name_pretty} is part of Julia's pre-installed <em>standard library</em>.`;
        }
        else {
            if (nbpkg_waiting_for_permission) {
                status = "will_be_installed";
                hint_raw = `${package_name} (v${lodash_js_1.default.last(available_versions)}) will be installed when you run this notebook.`;
                hint = (0, Preact_js_1.html) `<header>${package_name_pretty} <pkg-version>v${lodash_js_1.default.last(available_versions)}</pkg-version></header>
                    will be installed when you run this notebook.`;
            }
            else if (busy) {
                status = "busy";
                hint_raw = `${package_name} (v${chosen_version}) is installing...`;
                hint = (0, Preact_js_1.html) `<header>${package_name_pretty} <pkg-version>v${chosen_version}</pkg-version></header>
                    is installing...`;
            }
            else {
                status = "installed";
                hint_raw = `${package_name} (v${chosen_version}) is installed in the notebook.`;
                hint = (0, Preact_js_1.html) `<header>
                        ${package_name_pretty}
                        <pkg-version>v${chosen_version}</pkg-version>
                    </header>
                    is installed in the notebook.`;
                offer_update = can_update(chosen_version, available_versions);
            }
        }
    }
    else {
        if (available_versions != null && lodash_js_1.default.isArray(available_versions)) {
            if (available_versions.length === 0) {
                status = "not_found";
                hint_raw = `The package "${package_name}" could not be found in the registry. Did you make a typo?`;
                hint = (0, Preact_js_1.html) `The package <em>"${package_name}"</em> could not be found in the registry.
                    <section><em>Did you make a typo?</em></section>`;
            }
            else {
                status = "will_be_installed";
                hint_raw = `${package_name} (v${lodash_js_1.default.last(available_versions)}) will be installed in the notebook when you run this cell.`;
                hint = (0, Preact_js_1.html) `<header>${package_name_pretty} <pkg-version>v${lodash_js_1.default.last(available_versions)}</pkg-version></header>
                    will be installed in the notebook when you run this cell.`;
            }
        }
    }
    return { status, hint, hint_raw, available_versions: available_versions ?? null, chosen_version, busy, offer_update, package_url };
};
exports.package_status = package_status;
/**
 * The little icon that appears inline next to a package import in code (e.g. `using PlutoUI ✅`)
 * @param {{
 *  package_name: string,
 *  pluto_actions: any,
 *  notebook_id: string,
 *  nbpkg: import("./Editor.js").NotebookPkgData?,
 * }} props
 */
const PkgStatusMark = ({ package_name, pluto_actions, notebook_id, nbpkg }) => {
    const [available_versions_msg, set_available_versions_msg] = (0, Preact_js_1.useState)(/** @type {{ versions?: string[], package_url?: string }?} */ (null));
    const [package_url, set_package_url] = (0, Preact_js_1.useState)(/** @type {string[]?} */ (null));
    (0, Preact_js_1.useEffect)(() => {
        let available_version_promise = pluto_actions.get_avaible_versions({ package_name, notebook_id }) ?? Promise.resolve([]);
        available_version_promise.then(set_available_versions_msg);
    }, [package_name]);
    const { status, hint_raw } = (0, exports.package_status)({
        nbpkg: nbpkg,
        package_name: package_name,
        is_disable_pkg: false,
        available_versions: available_versions_msg?.versions,
        package_url: available_versions_msg?.package_url,
    });
    return (0, Preact_js_1.html) `
        <pkg-status-mark
            title=${hint_raw}
            className=${status === "busy"
        ? "busy"
        : status === "installed"
            ? "installed"
            : status === "not_found"
                ? "not_found"
                : status === "will_be_installed"
                    ? "will_be_installed"
                    : ""}
        >
            <button
                onClick=${(event) => {
        (0, open_pluto_popup_js_1.open_pluto_popup)({
            type: "nbpkg",
            source_element: event.currentTarget.parentElement,
            package_name: package_name,
            is_disable_pkg: false,
            should_focus: true,
        });
    }}
            >
                <span></span>
            </button>
        </pkg-status-mark>
    `;
};
exports.PkgStatusMark = PkgStatusMark;
const PkgActivateMark = ({ package_name }) => {
    const { hint_raw } = (0, exports.package_status)({
        nbpkg: null,
        package_name: package_name,
        is_disable_pkg: true,
    });
    return (0, Preact_js_1.html) `
        <pkg-status-mark title=${hint_raw} class="disable_pkg">
            <button
                onClick=${(event) => {
        (0, open_pluto_popup_js_1.open_pluto_popup)({
            type: "nbpkg",
            source_element: event.currentTarget.parentElement,
            package_name: package_name,
            is_disable_pkg: true,
            should_focus: true,
        });
    }}
            >
                <span></span>
            </button>
        </pkg-status-mark>
    `;
};
exports.PkgActivateMark = PkgActivateMark;
