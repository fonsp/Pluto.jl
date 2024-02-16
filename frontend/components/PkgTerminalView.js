import AnsiUp from "../imports/AnsiUp.js"
import { html, Component, useState, useEffect, useRef, useLayoutEffect } from "../imports/Preact.js"

const make_spinner_spin = (original_html) => original_html.replaceAll("◐", `<span class="make-me-spin">◐</span>`)

const TerminalViewAnsiUp = ({ value }) => {
    const node_ref = useRef(/** @type {HTMLElement?} */ (null))

    const start_time = useRef(Date.now())

    useEffect(() => {
        if (!node_ref.current) return
        node_ref.current.style.cssText = `--animation-delay: -${(Date.now() - start_time.current) % 1000}ms`
        node_ref.current.innerHTML = make_spinner_spin(new AnsiUp().ansi_to_html(value))
        const parent = node_ref.current.parentElement
        if (parent) parent.scrollTop = 1e5
    }, [node_ref.current, value])

    return !!value
        ? html`<pkg-terminal
              ><div class="scroller" tabindex="0"><pre ref=${node_ref} class="pkg-terminal"></pre></div
          ></pkg-terminal>`
        : null
}

export const PkgTerminalView = TerminalViewAnsiUp
