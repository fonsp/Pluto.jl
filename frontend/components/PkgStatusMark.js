import _ from "../imports/lodash.js"

import observablehq_for_myself from "../common/SetupCellEnvironment.js"

const html = observablehq_for_myself.html

const fillr = (parts, filler) => [...parts, ...new Array(3 - parts.length).fill(filler)]

const range_hint = (v) => {
    if (v === "stdlib") {
        return "Standard library included with Julia"
    }
    const parts = v.split(".")

    return `${fillr(parts, 0).join(".")} until ${fillr(parts, "99").join(".")}${parts.length < 3 ? "+" : ""}`
    // that's right, 99
}

// not preact because we're too cool
export const PkgStatusMark = ({ package_name, refresh_cm, pluto_actions, notebook_id }) => {
    const button = html`<button><span></span></button>`
    const node = html`<pkg-status-mark>${button}</pkg-status-mark>`
    // const nbpkg_local_ref = { current: null }
    const nbpkg_ref = { current: null }
    const available_ranges_ref = { current: null }

    const render = () => {
        console.log(nbpkg_ref.current)
        const me = nbpkg_ref.current?.installed_versions[package_name]
        if (nbpkg_ref.current != null) {
            node.title = me
        }
        let status = null
        if (me != null || _.isEqual(available_ranges_ref.current, ["stdlib"])) {
            status = "installed"
            node.title =
                me == null ? `${package_name} is part of Julia's pre-installed 'standard library'.` : `${package_name} (v${me}) is installed in the notebook.`
        } else {
            if (_.isArray(available_ranges_ref.current)) {
                if (available_ranges_ref.current.length === 0) {
                    status = "not_found"
                    node.title = `The package "${package_name}" could not be found in the registry. Did you make a typo?`
                } else {
                    status = "will_be_installed"
                    node.title = `${package_name} (v${_.last(available_ranges_ref.current)}) will be installed in the notebook when you run this cell.`
                }
            }
        }
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

    pluto_actions.send("nbpkg_available_versions", { package_name: package_name }, { notebook_id: notebook_id }).then(({ message }) => {
        available_ranges_ref.current = message.versions
        console.log(message.versions)
        render()
    })

    return node
}
