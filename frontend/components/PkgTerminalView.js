import AnsiUp from "../imports/AnsiUp.js"
import { html, Component, useState, useEffect, useRef, useLayoutEffect } from "../imports/Preact.js"

const TerminalViewAnsiUp = ({ value }) => {
    const node_ref = useRef(null)

    useEffect(() => {
        node_ref.current.innerHTML = AnsiUp.ansi_to_html(value)
        node_ref.current.parentElement.scrollTop = 1e5
    }, [value])

    return html`<pkg-terminal
        ><div class="scroller"><pre ref=${node_ref} class="pkg-terminal"></pre></div
    ></pkg-terminal>`
}

export const PkgTerminalView = TerminalViewAnsiUp
