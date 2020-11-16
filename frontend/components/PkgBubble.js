import observablehq_for_myself from "../common/SetupCellEnvironment.js"

const html = observablehq_for_myself.html

// not preact because we're too cool
export const PkgBubble = ({ client, package_name }) => {
    const node = html`<pkg-bubble>...</pkg-bubble>`
    const pkg_state_ref = { current: null }
    const versions_ref = { current: [] }

    const render = () => {
        const me = pkg_state_ref.current?.packages.find((p) => p.name === package_name)
        const installed = me != null
        node.classList.toggle("installed", installed)
        node.title = installed ? "" : "This version will be installed"

        const select = html`<select>
            ${versions_ref.current.map((x, i) => {
                const o = html`<option>${x}</option>`
                const installed = me != null && me.version === x
                o.classList.toggle("installed", installed)
                o.selected = installed
                return o
            })}
        </select>`

        select.onchange = (e) => {
            const new_version = select.value
            node.classList.toggle("installed", new_version === me?.version)
        }

        node.innerHTML = ""
        node.appendChild(select)
    }

    node.on_pkg_state = (p) => {
        pkg_state_ref.current = p
        render()
    }

    client.send("package_versions", { package_name: package_name }, {}).then(({ message }) => {
        versions_ref.current = message.versions.reverse()
        render()
    })

    return node
}
