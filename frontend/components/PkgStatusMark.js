import _ from "../imports/lodash.js"
import { html as phtml } from "../imports/Preact.js"

import observablehq_for_myself from "../common/SetupCellEnvironment.js"
const html = observablehq_for_myself.html

export const package_status = ({ nbpkg, package_name, available_versions }) => {
    console.log(available_versions)

    let status = null
    let hint_raw = null
    let hint = null
    const installed_version = nbpkg?.installed_versions[package_name]

    if (installed_version != null || _.isEqual(available_versions, ["stdlib"])) {
        status = "installed"
        if (installed_version == null || installed_version === "stdlib") {
            hint_raw = `${package_name} is part of Julia's pre-installed 'standard library'.`
            hint = phtml`<b>${package_name}</b> is part of Julia's pre-installed <em>standard library</em>.`
        } else {
            hint_raw = `${package_name} (v${installed_version}) is installed in the notebook.`
            hint = phtml`<header><b>${package_name}</b> <pkg-version>v${installed_version}</pkg-version></header> is installed in the notebook.`
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

    return { status, hint, hint_raw, available_versions, installed_version }
}

export const get_avaible_versions = async ({ package_name, pluto_actions, notebook_id }) => {
    const { message } = await pluto_actions.send("nbpkg_available_versions", { package_name: package_name }, { notebook_id: notebook_id })
    return message.versions
}

// not preact because we're too cool
export const PkgStatusMark = ({ package_name, refresh_cm, pluto_actions, notebook_id }) => {
    const button = html`<button><span></span></button>`
    const node = html`<pkg-status-mark>${button}</pkg-status-mark>`
    // const nbpkg_local_ref = { current: null }
    const nbpkg_ref = { current: null }
    const available_versions_ref = { current: null }

    const render = () => {
        const { status, hint_raw } = package_status({
            nbpkg: nbpkg_ref.current,
            package_name: package_name,
            available_versions: available_versions_ref.current,
        })

        node.title = hint_raw

        node.classList.toggle("installed", status === "installed")
        node.classList.toggle("not_found", status === "not_found")
        node.classList.toggle("will_be_installed", status === "will_be_installed")

        refresh_cm()
    }

    node.on_nbpkg_local = (p) => {
        // nbpkg_local_ref.current = p
        // render()
    }
    node.on_nbpkg = (p) => {
        nbpkg_ref.current = p
        render()
    }

    get_avaible_versions({ package_name, pluto_actions, notebook_id }).then((versions) => {
        available_versions_ref.current = versions
        console.log(versions)
        render()
    })

    button.onclick = () => {
        window.dispatchEvent(
            new CustomEvent("open nbpkg popup", {
                detail: {
                    status_mark_element: node,
                    package_name: package_name,
                },
            })
        )
    }

    return node
}
