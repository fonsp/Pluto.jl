import { html } from "../imports/Preact.js"

export const MultiplayerPanel = ({ users }) => {
    if (!users || Object.keys(users).length == 1) return

    return html`
        <div className="pluto-multiplayer">
            <ul>
                ${Object.entries(users).map(
                    ([clientID, { name, color, focused_cell }]) => html`<li key=${clientID} style=${`color: ${color};`}>${name} - ${focused_cell}</li>`
                )}
            </ul>
        </div>
    `
}
