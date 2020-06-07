import { html } from "./Editor.js"
import {render, Component } from "https://unpkg.com/preact@10.4.4?module"

// import { codeMirrors } from "./Editor.js"


function StackFrameFilename(frame, cell_id) {
    const sep_index = frame.file.indexOf("#==#")
    if (sep_index != -1) {
        const frameCellID = frame.file.substr(sep_index + 4)
        const a = html`<a href="#" onclick=${e => {
            cellRedirect(frameCellID, frame.line - 1) // 1-based to 0-based index
            e.preventDefault()
        }}>
            ${frameCellID == cell_id ? "Local" : "Other"}: ${frame.line}
        </a>`
        return html`<em>${a}</em>`
    } else {
        return html`<em>${frame.file}:${frame.line}</em>`
    }
}

function renderFunccall(frame) {
    const bracket_index = frame.call.indexOf("(")
    if (bracket_index != -1) {
        return html`<mark><strong>${frame.call.substr(0, bracket_index)}</strong>${frame.call.substr(bracket_index)}</mark>`
    } else {
        return html`<mark><strong>${frame.call}</strong></mark>`
    }
}

export function ErrorMessage({ msg, stacktrace, cell_id }) {
    return html`<jlerror>
        <header>
            ${rewrittenError(msg)
                .split("\n")
                .map((line) => html`<p>${line}</p>`)}
        </header>
        ${stacktrace.length == 0
            ? null
            : html`<section>
                  <ol>
                      ${stacktrace.map(
                          (frame) =>
                              html`<li>
                                  ${renderFunccall(frame)}<span>@</span>${StackFrameFilename(frame, cell_id)}${frame.inlined
                                      ? html`<span>[inlined]</span>`
                                      : null}
                              </li>`
                      )}
                  </ol>
              </section>`}
    </jlerror>`
}

function cellRedirect(cell_id, line) { // TODO: move to Cell class
    // codeMirrors[cell_id].setSelection({ line: line, ch: 0 }, { line: line, ch: Infinity }, { scroll: true })
    // codeMirrors[cell_id].focus()
}

const errorRewrites = [
    {
        from: "syntax: extra token after end of expression",
        to: 'Multiple expressions in one cell.\n<a href="#" onclick="errorHint(event)">Wrap all code in a `begin ... end` block.</a>',
    },
]

function rewrittenError(old_raw) {
    let new_raw = old_raw
    errorRewrites.forEach((rw) => {
        new_raw = new_raw.replace(rw.from, rw.to)
    })
    return new_raw
}

// move up the dom tree until the tag is found
function parentByTag(el, tag) {
    return !el || el.tagName == tag ? el : parentByTag(el.parentElement, tag)
}

function errorHint(e) {
    const cellNode = parentByTag(e.target, "CELL")
    // wrapInBlock(codeMirrors[cellNode.id], "begin")
    requestchange_cell(cellNode.id)
    e.preventDefault()
}

function wrapInBlock(cm, block = "begin") {
    const oldVal = cm.getValue()
    cm.setValue(block + "\n\t" + oldVal.replace(/\n/g, "\n\t") + "\n" + "end")
}
