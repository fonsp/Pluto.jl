import { PlutoActionsContext } from "../common/PlutoContext.js"
import { html, useContext, useState } from "../imports/Preact.js"

const StackFrameFilename = ({ frame, cell_id }) => {
    const sep_index = frame.file.indexOf("#==#")
    if (sep_index != -1) {
        const frame_cell_id = frame.file.substr(sep_index + 4, 36)
        const a = html`<a
            href="#"
            onclick=${(e) => {
                window.dispatchEvent(
                    new CustomEvent("cell_focus", {
                        detail: {
                            cell_id: frame_cell_id,
                            line: frame.line - 1, // 1-based to 0-based index
                        },
                    })
                )
                e.preventDefault()
            }}
        >
            ${frame_cell_id == cell_id ? "Local" : "Other"}: ${frame.line}
        </a>`
        return html`<em>${a}</em>`
    } else {
        return html`<em title=${frame.path}>${frame.file}:${frame.line}</em>`
    }
}

const Funccall = ({ frame }) => {
    const bracket_index = frame.call.indexOf("(")
    if (bracket_index != -1) {
        return html`<mark><strong>${frame.call.substr(0, bracket_index)}</strong>${frame.call.substr(bracket_index)}</mark>`
    } else {
        return html`<mark><strong>${frame.call}</strong></mark>`
    }
}

const insert_commas_and_and = (/** @type {any[]} */ xs) => xs.flatMap((x, i) => (i === xs.length - 1 ? [x] : i === xs.length - 2 ? [x, " and "] : [x, ", "]))

export const ErrorMessage = ({ msg, stacktrace, cell_id }) => {
    let pluto_actions = useContext(PlutoActionsContext)
    const default_rewriter = {
        pattern: /.?/,
        display: (/** @type{string} */ x) => x.split("\n").map((line) => html`<p>${line}</p>`),
    }
    const rewriters = [
        {
            pattern: /syntax: extra token after end of expression/,
            display: (/** @type{string} */ x) => {
                const begin_hint = html`<a
                    href="#"
                    onClick=${(e) => {
                        e.preventDefault()
                        pluto_actions.wrap_remote_cell(cell_id, "begin")
                    }}
                    >Wrap all code in a <em>begin ... end</em> block.</a
                >`
                if (x.includes("\n\nBoundaries: ")) {
                    const boundaries = JSON.parse(x.split("\n\nBoundaries: ")[1]).map((x) => x - 1) // Julia to JS index
                    const split_hint = html`<p>
                        <a
                            href="#"
                            onClick=${(e) => {
                                e.preventDefault()
                                pluto_actions.split_remote_cell(cell_id, boundaries, true)
                            }}
                            >Split this cell into ${boundaries.length} cells</a
                        >, or
                    </p>`
                    return html`<p>Multiple expressions in one cell.</p>
                        <p>How would you like to fix it?</p>
                        <ul>
                            <li>${split_hint}</li>
                            <li>${begin_hint}</li>
                        </ul>`
                } else {
                    return html`<p>Multiple expressions in one cell.</p>
                        <p>${begin_hint}</p>`
                }
            },
        },
        {
            pattern: /LoadError: cannot assign a value to variable workspace#\d+\..+ from module workspace#\d+/,
            display: () =>
                html`<p>Tried to reevaluate an <code>include</code> call, this is not supported. You might need to restart this notebook from the main menu.</p>
                    <p>
                        For a workaround, use the alternative version of <code>include</code> described here:
                        <a target="_blank" href="https://github.com/fonsp/Pluto.jl/issues/115#issuecomment-661722426">GH issue 115</a>
                    </p>
                    <p>In the future, <code>include</code> will be deprecated, and this will be the default.</p>`,
        },
        {
            pattern: /MethodError: no method matching .*\nClosest candidates are:/,
            display: (/** @type{string} */ x) => x.split("\n").map((line) => html`<p style="white-space: nowrap;">${line}</p>`),
        },
        {
            pattern: /Cyclic references among (.*)\./,
            display: (/** @type{string} */ x) =>
                x.split("\n").map((line) => {
                    const match = line.match(/Cyclic references among (.*)\./)

                    if (match) {
                        let syms_string = match[1]
                        let syms = syms_string.split(/, | and /)

                        let symbol_links = syms.map((what) => html`<a href="#${encodeURI(what)}">${what}</a>`)

                        return html`<p>Cyclic references among${" "}${insert_commas_and_and(symbol_links)}.</p>`
                    } else {
                        return html`<p>${line}</p>`
                    }
                }),
        },
        {
            pattern: /Multiple definitions for (.*)\./,
            display: (/** @type{string} */ x) =>
                x.split("\n").map((line) => {
                    const match = line.match(/Multiple definitions for (.*)\./)

                    if (match) {
                        let syms_string = match[1]
                        let syms = syms_string.split(/, | and /)

                        let symbol_links = syms.map((what) => {
                            const onclick = (ev) => {
                                const where = document.querySelector(`pluto-cell:not([id='${cell_id}']) span[id='${encodeURI(what)}']`)
                                ev.preventDefault()
                                where?.scrollIntoView()
                            }
                            return html`<a href="#" onclick=${onclick}>${what}</a>`
                        })

                        return html`<p>Multiple definitions for${" "}${insert_commas_and_and(symbol_links)}.</p>`
                    } else {
                        return html`<p>${line}</p>`
                    }
                }),
        },
        {
            pattern: /^UndefVarError: (.*) not defined\.?$/,
            display: (/** @type{string} */ x) => {
                const notebook = /** @type{import("./Editor.js").NotebookData?} */ (pluto_actions.get_notebook())
                const erred_upstreams = get_erred_upstreams(notebook, cell_id)

                // Verify that the UndefVarError is indeed about a variable from an upstream cell.
                const match = x.match(/UndefVarError: (.*) not defined/)
                let sym = match?.[1] ?? ""
                const undefvar_is_from_upstream = Object.values(notebook?.cell_dependencies ?? {}).some((map) =>
                    Object.keys(map.downstream_cells_map).includes(sym)
                )

                if (Object.keys(erred_upstreams).length === 0 || !undefvar_is_from_upstream) {
                    return html`<p>${x}</p>`
                }

                const symbol_links = Object.keys(erred_upstreams).map((key) => {
                    const onclick = (ev) => {
                        ev.preventDefault()
                        const where = document.querySelector(`pluto-cell[id='${erred_upstreams[key]}']`)
                        where?.scrollIntoView()
                    }
                    return html`<a href="#" onclick=${onclick}>${key}</a>`
                })

                // const plural = symbol_links.length > 1
                return html`<p><em>Another cell defining ${insert_commas_and_and(symbol_links)} contains errors.</em></p>`
            },
            show_stacktrace: () => {
                const erred_upstreams = get_erred_upstreams(pluto_actions.get_notebook(), cell_id)
                return Object.keys(erred_upstreams).length === 0
            },
        },
        default_rewriter,
    ]

    const matched_rewriter = rewriters.find(({ pattern }) => pattern.test(msg)) ?? default_rewriter

    return html`<jlerror>
        <header>${matched_rewriter.display(msg)}</header>
        ${stacktrace.length == 0 || !(matched_rewriter.show_stacktrace?.() ?? true)
            ? null
            : html`<section>
                  <ol>
                      ${stacktrace.map(
                          (frame) =>
                              html`<li>
                                  <${Funccall} frame=${frame} />
                                  <span>@</span>
                                  <${StackFrameFilename} frame=${frame} cell_id=${cell_id} />
                                  ${frame.inlined ? html`<span>[inlined]</span>` : null}
                              </li>`
                      )}
                  </ol>
              </section>`}
    </jlerror>`
}

const get_erred_upstreams = (
    /** @type {import("./Editor.js").NotebookData?} */ notebook,
    /** @type {string} */ cell_id,
    /** @type {string[]} */ visited_edges = []
) => {
    let erred_upstreams = {}
    if (notebook != null && notebook?.cell_results?.[cell_id]?.errored) {
        const referenced_variables = Object.keys(notebook.cell_dependencies[cell_id]?.upstream_cells_map)

        referenced_variables.forEach((key) => {
            if (!visited_edges.includes(key)) {
                visited_edges.push(key)
                const cells_that_define_this_variable = notebook.cell_dependencies[cell_id]?.upstream_cells_map[key]

                cells_that_define_this_variable.forEach((upstream_cell_id) => {
                    let upstream_errored_cells = get_erred_upstreams(notebook, upstream_cell_id, visited_edges) ?? {}

                    erred_upstreams = { ...erred_upstreams, ...upstream_errored_cells }
                    // if upstream got no errors and current cell is errored
                    // then current cell is responsible for errors
                    if (Object.keys(upstream_errored_cells).length === 0 && notebook.cell_results[upstream_cell_id].errored && upstream_cell_id !== cell_id) {
                        erred_upstreams[key] = upstream_cell_id
                    }
                })
            }
        })
    }
    return erred_upstreams
}
