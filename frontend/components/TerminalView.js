import AnsiUp from "../imports/AnsiUp.js"
import { html, Component, useState, useEffect, useRef, useLayoutEffect } from "../imports/Preact.js"

import Terminal from "../imports/xterm.js"

const TerminalViewXterm = ({ value }) => {
    const term_ref = useRef(null)
    const node_ref = useRef(null)

    useLayoutEffect(() => {
        var term = new Terminal({
            cols: 40,
            rows: 20,
        })
        term_ref.current = term

        term.open(node_ref.current)
        term.setOption("disableStdin", true)
        term.setOption("cursorStyle", "bar")
    })

    let buffer = useRef("")
    let index = useRef(0)

    let queue = useRef(Promise.resolve())

    useEffect(() => {
        queue.current = queue.current.then(
            () =>
                new Promise((r) => {
                    if (!value.startsWith(buffer)) {
                        term_ref.current.clear()
                        term_ref.current.write("\r")
                        buffer.current = ""
                        index.current = 0
                    }

                    buffer.current = value
                    term_ref.current.write(buffer.current.slice(index.current), r)
                    index.current = buffer.current.length
                })
        )
    }, [value])

    return html`<div ref=${node_ref} class="pluto_term"></div>`
}

const TerminalViewAnsiUp = ({ value }) => {
    const node_ref = useRef(null)

    useEffect(() => {
        node_ref.current.innerHTML = AnsiUp.ansi_to_html(value)
    }, [value])

    return html`<pre><code ref=${node_ref} class="pluto_term"></code></pre>`
}

export const TerminalView = TerminalViewAnsiUp
