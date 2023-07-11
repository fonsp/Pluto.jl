import { html, useEffect, useState, useContext, useRef, useMemo } from "../imports/Preact.js"

export const SliderServerStatus = ({ interactive }) => {
    const details_message = interactive ? "Connected to sliders!" : ""
    return html`<div id="sliderstatus-container" title=${details_message}>${interactive && html`<span></span>`}</div>`
}
