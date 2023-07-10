import { html, useEffect, useState, useContext, useRef, useMemo } from "../imports/Preact.js"

export const SliderServerStatus = ({ bond_connections }) => {
    return html`<preamble>
        <!-- TODO: detach with own styles -->
        <div id="saveall-container" class="overlay-button">
            <button title="More status info here...">
                <span>Connecting...</span>
            </button>
        </div>
    </preamble>`
}
