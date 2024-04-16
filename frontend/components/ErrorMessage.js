import { cl } from "../common/ClassTable.js"
import { PlutoActionsContext } from "../common/PlutoContext.js"
import { EditorState, EditorView, julia_andrey, lineNumbers, syntaxHighlighting } from "../imports/CodemirrorPlutoSetup.js"
import { html, useContext, useEffect, useLayoutEffect, useRef, useState } from "../imports/Preact.js"
import { pluto_syntax_colors } from "./CellInput.js"
import { highlight } from "./CellOutput.js"
import { Editor } from "./Editor.js"

const extract_cell_id = (/** @type {string} */ file) => {
    const sep_index = file.indexOf("#==#")
    if (sep_index != -1) {
        return file.substring(sep_index + 4, sep_index + 4 + 36)
    } else {
        return null
    }
}

const focus_line = (cell_id, line) =>
    window.dispatchEvent(
        new CustomEvent("cell_focus", {
            detail: {
                cell_id: cell_id,
                line: line,
            },
        })
    )

const StackFrameFilename = ({ frame, cell_id }) => {
    if (ignore_location(frame)) return null

    const frame_cell_id = extract_cell_id(frame.file)
    if (frame_cell_id != null) {
        const a = html`<a
            internal-file=${frame.file}
            href=${`#${frame_cell_id}`}
            onclick=${(e) => {
                focus_line(frame_cell_id, frame.line - 1)
                e.preventDefault()
            }}
        >
            ${frame_cell_id == cell_id ? "This cell" : "Other cell"}: line ${frame.line}
        </a>`
        return html`<em>${a}</em>`
    } else {
        return html`<em title=${frame.path}
            ><a class="remote-url" href=${frame?.url?.startsWith?.("https") ? frame.url : null}>${frame.file}:${frame.line}</a></em
        >`
    }
}

const at = html`<span> @ </span>`

const ignore_funccall = (frame) => frame.call === "top-level scope"
const ignore_location = (frame) => frame.file === "none"

const Funccall = ({ frame }) => {
    if (ignore_funccall(frame)) return null

    const bracket_index = frame.call.indexOf("(")

    let inner =
        bracket_index != -1
            ? html`<strong>${frame.call.substr(0, bracket_index)}</strong>${frame.call.substr(bracket_index)}`
            : html`<strong>${frame.call}</strong>`

    return html`<mark>${inner}</mark>${at}`
}

const LinePreview = ({ frame, num_context_lines = 2 }) => {
    let pluto_actions = useContext(PlutoActionsContext)
    let cell_id = extract_cell_id(frame.file)
    if (cell_id) {
        let code = /** @type{import("./Editor.js").NotebookData?} */ (pluto_actions.get_notebook())?.cell_inputs[cell_id]?.code

        if (code) {
            const lines = code.split("\n")
            return html`<a
                onclick=${(e) => {
                    focus_line(cell_id, frame.line - 1)
                    e.preventDefault()
                }}
                href=${`#${cell_id}`}
                class="frame-line-preview"
                ><div>
                    <pre>
${lines.map((line, i) =>
                            frame.line - 1 - num_context_lines <= i && i <= frame.line - 1 + num_context_lines
                                ? html`<${JuliaHighlightedLine} code=${line} i=${i} frameLine=${i === frame.line - 1} />`
                                : null
                        )}</pre
                    >
                </div></a
            >`
        }
    }
}

const JuliaHighlightedLine = ({ code, frameLine, i }) => {
    const code_ref = useRef(/** @type {HTMLPreElement?} */ (null))
    useLayoutEffect(() => {
        if (code_ref.current) {
            code_ref.current.innerText = code
            highlight(code_ref.current, "julia")
        }
    }, [code_ref.current, code])

    return html`<code
        ref=${code_ref}
        style=${`--before-content: "${i + 1}";`}
        class=${cl({
            "language-julia": true,
            "frame-line": frameLine,
        })}
    ></code>`
}

const insert_commas_and_and = (/** @type {any[]} */ xs) => xs.flatMap((x, i) => (i === xs.length - 1 ? [x] : i === xs.length - 2 ? [x, " and "] : [x, ", "]))

export const ParseError = ({ cell_id, diagnostics }) => {
    useEffect(() => {
        window.dispatchEvent(
            new CustomEvent("cell_diagnostics", {
                detail: {
                    cell_id,
                    diagnostics,
                },
            })
        )
        return () => window.dispatchEvent(new CustomEvent("cell_diagnostics", { detail: { cell_id, diagnostics: [] } }))
    }, [diagnostics])

    return html`
        <jlerror>
            <header><p>Syntax error</p></header>
            <section>
                <div class="stacktrace-header"><secret-h1>Syntax errors</secret-h1></div>
                <ol>
                    ${diagnostics.map(
                        ({ message, from, to, line }) =>
                            html`<li
                                class="from_this_notebook from_this_cell"
                                onmouseenter=${() =>
                                    // NOTE: this could be moved move to `StackFrameFilename`
                                    window.dispatchEvent(new CustomEvent("cell_highlight_range", { detail: { cell_id, from, to } }))}
                                onmouseleave=${() =>
                                    window.dispatchEvent(new CustomEvent("cell_highlight_range", { detail: { cell_id, from: null, to: null } }))}
                            >
                                <div class="classical-frame">
                                    ${message}${at}<${StackFrameFilename} frame=${{ file: "#==#" + cell_id, line }} cell_id=${cell_id} />
                                </div>
                            </li>`
                    )}
                </ol>
            </section>
        </jlerror>
    `
}

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
            show_stacktrace: () => false,
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
            pattern: /^syntax: (.*)$/,
            display: default_rewriter.display,
            show_stacktrace: () => false,
        },
        {
            pattern: /^\s*$/,
            display: () => default_rewriter.display("Error"),
        },
        {
            pattern: /^UndefVarError: (.*) not defined\.?$/,
            display: (/** @type{string} */ x) => {
                const notebook = /** @type{import("./Editor.js").NotebookData?} */ (pluto_actions.get_notebook())
                const erred_upstreams = get_erred_upstreams(notebook, cell_id)

                // Verify that the UndefVarError is indeed about a variable from an upstream cell.
                const match = x.match(/UndefVarError: (.*) not defined/)
                let sym = (match?.[1] ?? "").replaceAll("`", "")
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

    const [show_more, set_show_more] = useState(false)
    useEffect(() => {
        set_show_more(false)
    }, [msg, stacktrace, cell_id])

    const first_stack_from_here = stacktrace.findIndex((frame) => extract_cell_id(frame.file) != null)

    const limited = !show_more && first_stack_from_here != -1 && first_stack_from_here < stacktrace.length - 1

    const limited_stacktrace = (limited ? stacktrace.slice(0, first_stack_from_here + 1) : stacktrace).filter(
        (frame) => !(ignore_location(frame) && ignore_funccall(frame))
    )

    return html`<jlerror>
        <header>${matched_rewriter.display(msg)}</header>
        ${stacktrace.length == 0 || !(matched_rewriter.show_stacktrace?.() ?? true)
            ? null
            : html`<section>
                  <div class="stacktrace-header">
                      <secret-h1>Stack trace</secret-h1>
                      <p>Here is what happened, the most recent locations are first:</p>
                  </div>

                  <ol>
                      ${limited_stacktrace.map((frame) => {
                          const frame_cell_id = extract_cell_id(frame.file)
                          const from_this_notebook = frame_cell_id != null
                          const from_this_cell = cell_id === frame_cell_id
                          return html`<li class=${cl({ from_this_notebook, from_this_cell })}>
                              <div class="classical-frame">
                                  <${Funccall} frame=${frame} />
                                  <${StackFrameFilename} frame=${frame} cell_id=${cell_id} />
                              </div>
                              ${from_this_notebook ? html`<${LinePreview} frame=${frame} num_context_lines=${from_this_cell ? 1 : 2} />` : null}
                          </li>`
                      })}
                      ${limited
                          ? html`<li>
                                <a
                                    href="#"
                                    onClick=${(e) => {
                                        set_show_more(true)
                                        e.preventDefault()
                                    }}
                                    >Show more...</a
                                >
                            </li>`
                          : null}
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
