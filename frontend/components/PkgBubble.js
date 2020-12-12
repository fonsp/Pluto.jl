import observablehq_for_myself from "../common/SetupCellEnvironment.js"

const html = observablehq_for_myself.html

const fillr = (parts, filler) => [...parts, ...new Array(3 - parts.length).fill(filler)]

const range_hint = (v) => {
    const parts = v.split(".")

    return `${fillr(parts, 0).join(".")} until ${fillr(parts, "99").join(".")}${parts.length < 3 ? "+" : ""}`
    // that's right, 99
}

// not preact because we're too cool
export const PkgBubble = ({ client, package_name, refresh }) => {
    const node = html`<pkg-bubble>...</pkg-bubble>`
    const pkg_state_ref = { current: null }
    const opinionated_ranges_ref = { current: { recommended: [], other: [] } }

    const render = () => {
        const me = pkg_state_ref.current?.packages.find((p) => p.name === package_name)
        const installed = me != null
        node.classList.toggle("installed", installed)
        node.classList.toggle("not_found", opinionated_ranges_ref.current.length === 0)
        node.title = installed ? "" : "This version will be installed"

        const v_entry = (x, i) => {
            const o = html`<option title="${range_hint(x)}">${x}</option>`
            const installed = me != null && me[me.type] === x
            o.classList.toggle("installed", installed)
            o.selected = installed
            return o
        }
        const select = html`<select>
            <optgroup label="Releases">${opinionated_ranges_ref.current.recommended.map(v_entry)}</optgroup>
            ${opinionated_ranges_ref.current.other.length === 0
                ? null
                : html`<optgroup label="Pre-releases">${opinionated_ranges_ref.current.other.map(v_entry)}</optgroup>`}
        </select>`

        select.onchange = (e) => {
            const new_version = select.value
            node.classList.toggle("installed", me != null && new_version === me[me.type])
        }

        node.innerHTML = ""
        if (opinionated_ranges_ref.current.length !== 0) {
        }
        node.appendChild(select)

        refresh()
    }

    node.on_pkg_state = (p) => {
        pkg_state_ref.current = p
        render()
    }

    client.send("package_versions", { package_name: package_name }, {}).then(({ message }) => {
        opinionated_ranges_ref.current = message.opinionated_ranges
        render()
    })

    return node
}
