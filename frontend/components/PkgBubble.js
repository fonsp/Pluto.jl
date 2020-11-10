import observablehq_for_myself from "../common/SetupCellEnvironment.js"

const html = observablehq_for_myself.html

export const PkgBubble = ({ client, package_name }) => {
    const node = html`<pkg-bubble>...</pkg-bubble>`

    client.send("package_versions", { package_name: package_name }, {}).then(({ message }) => {
        console.log(message)
        node.innerHTML = ""
        node.appendChild(html`<select>
            ${message.versions.reverse().map((x, i) => html`<option>${x}</option>`)}
        </select>`)
    })

    return node
}
