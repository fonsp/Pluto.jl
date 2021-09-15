import _ from "../imports/lodash.js"
import { html as phtml } from "../imports/Preact.js"

import observablehq_for_myself from "../common/SetupCellEnvironment.js"
// widgets inside codemirror need to be DOM elements, not Preact VDOM components. So in this code, we will use html from observablehq, which is just like html from Preact, except it creates DOM nodes directly, not Preact VDOM elements.
const html = observablehq_for_myself.html

export const nbpkg_fingerprint = (nbpkg) => (nbpkg == null ? [null] : Object.entries(nbpkg))

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

export const package_status = ({ nbpkg, package_name, available_versions, is_disable_pkg }) => {
    let status = null
    let hint_raw = null
    let hint = null
    let offer_update = false
    const chosen_version = nbpkg?.installed_versions[package_name]
    const busy = (nbpkg?.busy_packages ?? []).includes(package_name) || nbpkg?.instantiating

    if (is_disable_pkg) {
        const f_name = package_name.substring(0, package_name.length - 1)
        status = "disable_pkg"
        hint_raw = `${f_name} disables Pluto's built-in package manager.`
        hint = phtml`<b>${f_name}</b> disables Pluto's built-in package manager.`
    } else if (chosen_version != null || _.isEqual(available_versions, ["stdlib"])) {
        if (chosen_version == null || chosen_version === "stdlib") {
            status = "installed"
            hint_raw = `${package_name} is part of Julia's pre-installed 'standard library'.`
            hint = phtml`<b>${package_name}</b> is part of Julia's pre-installed <em>standard library</em>.`
        } else {
            if (busy) {
                status = "busy"
                hint_raw = `${package_name} (v${chosen_version}) is installing...`
                hint = phtml`<header><b>${package_name}</b> <pkg-version>v${chosen_version}</pkg-version></header> is installing...`
            } else {
                status = "installed"
                hint_raw = `${package_name} (v${chosen_version}) is installed in the notebook.`
                hint = phtml`<header><b>${package_name}</b> <pkg-version>v${chosen_version}</pkg-version></header> is installed in the notebook.`
                offer_update = can_update(chosen_version, available_versions)
            }
        }
    } else {
        if (_.isArray(available_versions)) {
            if (available_versions.length === 0) {
                status = "not_found"
                hint_raw = `The package "${package_name}" could not be found in the registry. Did you make a typo?`
                hint = phtml`The package <em>"${package_name}"</em> could not be found in the registry. <section><em>Did you make a typo?</em></section>`
            } else {
                status = "will_be_installed"
                hint_raw = `${package_name} (v${_.last(available_versions)}) will be installed in the notebook when you run this cell.`
                hint = phtml`<header><b>${package_name}</b> <pkg-version>v${_.last(
                    available_versions
                )}</pkg-version></header> will be installed in the notebook when you run this cell.`
            }
        }
    }

    return { status, hint, hint_raw, available_versions, chosen_version, busy, offer_update }
}

// not preact because we're too cool
export const PkgStatusMark = ({ package_name, refresh_cm, pluto_actions, notebook_id }) => {
    const button = html`<button><span></span></button>`
    const node = html`<pkg-status-mark>${button}</pkg-status-mark>`
    const nbpkg_ref = { current: null }
    const available_versions_ref = { current: null }

    const render = () => {
        const { status, hint_raw } = package_status({
            nbpkg: nbpkg_ref.current,
            package_name: package_name,
            is_disable_pkg: false,
            available_versions: available_versions_ref.current,
        })

        node.title = hint_raw

        node.classList.toggle("busy", status === "busy")
        node.classList.toggle("installed", status === "installed")
        node.classList.toggle("not_found", status === "not_found")
        node.classList.toggle("will_be_installed", status === "will_be_installed")

        // We don't need to refresh the codemirror for most updates because every mark is exactly the same size.
        // refresh_cm()
    }

    node.on_nbpkg = (p) => {
        // if nbpkg is switched on/off
        if ((nbpkg_ref.current == null) !== (p == null)) {
            // refresh codemirror because the mark will appear/disappear
            refresh_cm()
            setTimeout(refresh_cm, 1000)
        }
        nbpkg_ref.current = p
        render()
    }
    ;(pluto_actions.get_avaible_versions({ package_name, notebook_id }) ?? Promise.resolve([])).then((versions) => {
        available_versions_ref.current = versions
        render()
    })

    button.onclick = () => {
        window.dispatchEvent(
            new CustomEvent("open nbpkg popup", {
                detail: {
                    status_mark_element: node,
                    package_name: package_name,
                    is_disable_pkg: false,
                },
            })
        )
    }

    return node
}

// not preact because we're too cool
export const PkgActivateMark = ({ package_name, refresh_cm }) => {
    const button = html`<button><span></span></button>`
    const node = html`<pkg-status-mark>${button}</pkg-status-mark>`

    const render = () => {
        const { hint_raw } = package_status({
            nbpkg: null,
            package_name: package_name,
            is_disable_pkg: true,
            available_versions: null,
        })
        node.title = hint_raw
        node.classList.toggle("disable_pkg", true)
    }
    render()

    node.on_nbpkg = (p) => {}

    button.onclick = () => {
        window.dispatchEvent(
            new CustomEvent("open nbpkg popup", {
                detail: {
                    status_mark_element: node,
                    package_name: package_name,
                    is_disable_pkg: true,
                },
            })
        )
    }

    return node
}

// This list appears multiple times in our codebase. Be sure to match edits everywhere.
export const pkg_disablers = [
    "Pkg.activate(",
    "Pkg.API.activate(",
    "Pkg.develop(",
    "Pkg.API.develop(",
    "Pkg.add(",
    "Pkg.API.add(",
    // https://juliadynamics.github.io/DrWatson.jl/dev/project/#DrWatson.quickactivate
    "quickactivate(",
    "@quickactivate",
]
