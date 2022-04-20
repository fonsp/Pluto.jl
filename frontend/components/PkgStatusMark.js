import _ from "../imports/lodash.js"
import { html, useEffect, useState } from "../imports/Preact.js"

export const nbpkg_fingerprint = (nbpkg) => (nbpkg == null ? [null] : Object.entries(nbpkg).flat())

export const nbpkg_fingerprint_without_terminal = (nbpkg) =>
    nbpkg == null ? [null] : Object.entries(nbpkg).flatMap(([k, v]) => (k === "terminal_outputs" ? [] : [v]))

const can_update = (installed, available) => {
    if (installed === "stdlib" || !_.isArray(available)) {
        return false
    } else {
        // return true
        return _.last(available) !== installed
    }
}

/**
 * @param {{
 *  package_name: string,
 *  is_disable_pkg: boolean,
 *  available_versions: string[],
 *  nbpkg: import("./Editor.js").NotebookPkgData?,
 * }} props
 */
export const package_status = ({ nbpkg, package_name, available_versions, is_disable_pkg }) => {
    let status = null
    let hint_raw = null
    let hint = null
    let offer_update = false
    const chosen_version = nbpkg?.installed_versions[package_name]
    const busy = (nbpkg?.busy_packages ?? []).includes(package_name) || !(nbpkg?.instantiated ?? true)

    if (is_disable_pkg) {
        const f_name = package_name
        status = "disable_pkg"
        hint_raw = `${f_name} disables Pluto's built-in package manager.`
        hint = html`<b>${f_name}</b> disables Pluto's built-in package manager.`
    } else if (chosen_version != null || _.isEqual(available_versions, ["stdlib"])) {
        if (chosen_version == null || chosen_version === "stdlib") {
            status = "installed"
            hint_raw = `${package_name} is part of Julia's pre-installed 'standard library'.`
            hint = html`<b>${package_name}</b> is part of Julia's pre-installed <em>standard library</em>.`
        } else {
            if (busy) {
                status = "busy"
                hint_raw = `${package_name} (v${chosen_version}) is installing...`
                hint = html`<header><b>${package_name}</b> <pkg-version>v${chosen_version}</pkg-version></header>
                    is installing...`
            } else {
                status = "installed"
                hint_raw = `${package_name} (v${chosen_version}) is installed in the notebook.`
                hint = html`<header><b>${package_name}</b> <pkg-version>v${chosen_version}</pkg-version></header>
                    is installed in the notebook.`
                offer_update = can_update(chosen_version, available_versions)
            }
        }
    } else {
        if (_.isArray(available_versions)) {
            if (available_versions.length === 0) {
                status = "not_found"
                hint_raw = `The package "${package_name}" could not be found in the registry. Did you make a typo?`
                hint = html`The package <em>"${package_name}"</em> could not be found in the registry.
                    <section><em>Did you make a typo?</em></section>`
            } else {
                status = "will_be_installed"
                hint_raw = `${package_name} (v${_.last(available_versions)}) will be installed in the notebook when you run this cell.`
                hint = html`<header><b>${package_name}</b> <pkg-version>v${_.last(available_versions)}</pkg-version></header>
                    will be installed in the notebook when you run this cell.`
            }
        }
    }

    return { status, hint, hint_raw, available_versions, chosen_version, busy, offer_update }
}

/**
 * @param {{
 *  package_name: string,
 *  pluto_actions: any,
 *  notebook_id: string,
 *  nbpkg: import("./Editor.js").NotebookPkgData?,
 * }} props
 */
export const PkgStatusMark = ({ package_name, pluto_actions, notebook_id, nbpkg }) => {
    const [available_versions, set_available_versions] = useState(null)

    useEffect(() => {
        let available_version_promise = pluto_actions.get_avaible_versions({ package_name, notebook_id }) ?? Promise.resolve([])
        available_version_promise.then((available_versions) => {
            set_available_versions(available_versions)
        })
    }, [package_name])

    const { status, hint_raw } = package_status({
        nbpkg: nbpkg,
        package_name: package_name,
        is_disable_pkg: false,
        available_versions: available_versions,
    })

    return html`
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
                    window.dispatchEvent(
                        new CustomEvent("open pluto popup", {
                            detail: {
                                type: "nbpkg",
                                source_element: event.currentTarget.parentElement,
                                package_name: package_name,
                                is_disable_pkg: false,
                            },
                        })
                    )
                }}
            >
                <span></span>
            </button>
        </pkg-status-mark>
    `
}

export const PkgActivateMark = ({ package_name }) => {
    const { hint_raw } = package_status({
        nbpkg: null,
        package_name: package_name,
        is_disable_pkg: true,
        available_versions: null,
    })

    return html`
        <pkg-status-mark title=${hint_raw} class="disable_pkg">
            <button
                onClick=${(event) => {
                    window.dispatchEvent(
                        new CustomEvent("open pluto popup", {
                            detail: {
                                type: "nbpkg",
                                source_element: event.currentTarget.parentElement,
                                package_name: package_name,
                                is_disable_pkg: true,
                            },
                        })
                    )
                }}
            >
                <span></span>
            </button>
        </pkg-status-mark>
    `
}
