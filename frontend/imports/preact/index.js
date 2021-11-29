// @ts-nocheck
import { render, Component, h, cloneElement, createContext, hydrate } from "preact"
import { useEffect, useLayoutEffect, useState, useRef, useMemo, useContext } from "preact/hooks"
import { render as render_html } from "preact-render-to-string"

import htm from "https://esm.sh/htm@3.0.4?target=es2020"

const html = htm.bind(h)

export { html, render, Component, useEffect, useLayoutEffect, useState, useRef, useMemo, createContext, useContext, h, cloneElement, hydrate, render_html }

import undom from "undom"

/**
 *	Prototype stateful server renderer.
 */
var doc
export function createUndomRenderer() {
    if (!doc) {
        doc = undom()
        Object.assign(window, doc.defaultView)
    }

    var root,
        parent = doc.createElement("x-root")
    doc.body.appendChild(parent)

    return {
        render: function (jsx) {
            root = render(jsx, parent, root)
            return this
        },
        html: function () {
            return serializeHtml(parent)
        },
    }
}

function serializeHtml(el) {
    if (el.nodeType === 3) return esc(el.nodeValue)
    var name = String(el.nodeName).toLowerCase(),
        str = "<" + name,
        hasClass = false,
        c,
        i
    for (i = 0; i < el.attributes.length; i++) {
        let name = el.attributes[i].name
        if (name === "class") hasClass = true
        str += " " + name + '="' + esc(el.attributes[i].value) + '"'
    }
    if (el.className && !hasClass) str += ' class="' + el.className + '"'
    str += ">"
    for (i = 0; i < el.childNodes.length; i++) {
        c = serializeHtml(el.childNodes[i])
        if (c) str += c
    }
    return str + "</" + name + ">"
}

function esc(str) {
    return String(str).replace(/[&<>"']/g, escMap)
}
function escMap(s) {
    return "&" + map[s] + ";"
}
var map = { "&": "amp", "<": "lt", ">": "gt", '"': "quot", "'": "apos" }
