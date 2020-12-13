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
export const PkgBubble = ({ client, package_name, refresh, actions }) => {
    const node = html`<pkg-bubble>...</pkg-bubble>`
    const pkg_state_ref = { current: null }
    const opinionated_ranges_ref = { current: { recommended: [], other: [] } }

    const render = () => {
        const me = pkg_state_ref.current?.packages[package_name]
        const is_set = me != null
        const is_running = is_set && me.running_version != null
        const is_stdlib = opinionated_ranges_ref.current.recommended.includes("stdlib")
        node.classList.toggle("installed", is_running)
        node.classList.toggle("not_found", opinionated_ranges_ref.current.recommended.length === 0)
        node.title = is_running ? "" : "This version will be installed"

        const v_entry = (x, i) => {
            const o = html`<option title="${range_hint(x)}">${x}</option>`
            const installed = is_set && me[me.type] === x
            o.classList.toggle("installed", installed)
            o.selected = installed
            return o
        }
        const or = opinionated_ranges_ref.current
        const non_traditional_choice = is_set && (me.type !== "version_range" || (!or.recommended.includes(me[me.type]) && !or.other.includes(me[me.type])))
        const select = html`<select>
            ${non_traditional_choice ? html`<optgroup label="Custom"><option>${me[me.type]}</option></optgroup>` : ""}
            ${or.recommended.length === 0 && or.other.length === 0 ? html`<option selected>...</option>` : ""}
            ${or.recommended.length === 0 ? "" : html`<optgroup label="Releases">${or.recommended.map(v_entry)}</optgroup>`}
            ${or.other.length === 0 ? "" : html`<optgroup label="Pre-releases">${or.other.map(v_entry)}</optgroup>`}
            ${is_stdlib
                ? ""
                : html`<optgroup label="Advanced">
                      <option>Refresh registry</option>
                      <option value="action_version_range">Version range...</option>
                      <option value="action_git">Git...</option>
                      <option value="action_local_path">Local path...</option>
                  </optgroup>`}
        </select>`

        if (!is_set) {
            select.value = or.recommended.length > 0 ? or.recommended[0] : ""
        }

        select.onchange = (e) => {
            const new_version = select.value
            if (new_version === "action_version_range") {
                const answer = prompt(`Enter a version range for ${package_name}:`)
                actions.update_local_pkg_state((state) => {
                    state.packages[package_name] = {
                        running_version: state.packages[package_name]?.running_version,
                        type: "version_range",
                        version_range: answer,
                    }
                })
            } else if (new_version === "action_git") {
                const answer = prompt(`Enter a git branch name or commit SHA for ${package_name}:`)
                actions.update_local_pkg_state((state) => {
                    state.packages[package_name] = {
                        running_version: state.packages[package_name]?.running_version,
                        type: "git_revision",
                        git_revision: "#" + answer,
                    }
                })
            } else if (new_version === "action_local_path") {
                const answer = prompt(`Enter a local path for ${package_name}:`)
                actions.update_local_pkg_state((state) => {
                    state.packages[package_name] = {
                        running_version: state.packages[package_name]?.running_version,
                        type: "local_path",
                        local_path: answer,
                    }
                })
            } else {
                node.classList.toggle("installed", me != null && new_version === me[me.type])

                actions.update_local_pkg_state((state) => {
                    state.packages[package_name] = {
                        running_version: state.packages[package_name]?.running_version,
                        type: "version_range",
                        version_range: select.value,
                    }
                })
            }
        }

        node.innerHTML = ""
        if (or.length !== 0) {
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
