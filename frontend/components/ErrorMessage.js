import { cl } from "../common/ClassTable.js"
import { PlutoActionsContext } from "../common/PlutoContext.js"
import { html, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "../imports/Preact.js"
import { highlight } from "./CellOutput.js"
import { PkgTerminalView } from "./PkgTerminalView.js"
import _ from "../imports/lodash.js"
import { open_bottom_right_panel } from "./BottomRightPanel.js"
import AnsiUp from "../imports/AnsiUp.js"

const extract_cell_id = (/** @type {string} */ file) => {
    if (file.includes("#@#==#")) return null
    const sep = "#==#"
    const sep_index = file.indexOf(sep)
    if (sep_index != -1) {
        return file.substring(sep_index + sep.length, sep_index + sep.length + 36)
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

const DocLink = ({ frame }) => {
    let pluto_actions = useContext(PlutoActionsContext)

    if (extract_cell_id(frame.file)) return null
    if (frame.parent_module == null) return null
    if (ignore_funccall(frame)) return null

    const funcname = frame.func
    if (funcname === "") return null

    const nb = pluto_actions.get_notebook()
    const pkg_name = frame.source_package
    const builtin = ["Main", "Core", "Base"].includes(pkg_name)
    const installed = nb?.nbpkg?.installed_versions?.[frame.source_package] != null
    if (!builtin && nb?.nbpkg != null && !installed) return null

    return html`  <span
            ><a
                href="#"
                class="doclink"
                onClick=${(e) => {
                    e.preventDefault()
                    open_bottom_right_panel("docs")
                    pluto_actions.set_doc_query(`${frame.parent_module}.${funcname}`)
                }}
                >docs</a
            ></span
        >`
}

const StackFrameFilename = ({ frame, cell_id }) => {
    if (ignore_location(frame)) return null

    const frame_cell_id = extract_cell_id(frame.file)
    const line = frame.line
    if (frame_cell_id != null) {
        return html`<a
            internal-file=${frame.file}
            href=${`#${frame_cell_id}`}
            onclick=${(e) => {
                focus_line(frame_cell_id, line == null ? null : line - 1)
                e.preventDefault()
            }}
        >
            ${frame_cell_id == cell_id ? "This\xa0cell" : "Other\xa0cell"}${line == null ? null : html`: <em>line ${line}</em>`}
        </a>`
    } else {
        const sp = frame.source_package
        const origin = ["Main", "Core", "Base"].includes(sp) ? "julia" : sp

        const file_line = html`<em>${frame.file.replace(/#@#==#.*/, "")}:${frame.line}</em>`

        const text = sp != null ? html`<strong>${origin}</strong> → ${file_line}` : file_line

        const href = frame?.url?.startsWith?.("https") ? frame.url : null
        return html`<a title=${frame.path} class="remote-url" href=${href}>${text}</a>`
    }
}

const at = html`<span> from </span>`

const ignore_funccall = (frame) => frame.call === "top-level scope"
const ignore_location = (frame) => frame.file === "none"

const funcname_args = (call) => {
    const anon_match = call.indexOf(")(")
    if (anon_match != -1) {
        return [call.substring(0, anon_match + 1), call.substring(anon_match + 1)]
    } else {
        const bracket_index = call.indexOf("(")
        if (bracket_index != -1) {
            return [call.substring(0, bracket_index), call.substring(bracket_index)]
        } else {
            return [call, ""]
        }
    }
}

const Funccall = ({ frame }) => {
    let [expanded_state, set_expanded] = useState(false)
    useEffect(() => {
        set_expanded(false)
    }, [frame])

    const silly_to_hide = (frame.call_short.match(/…/g) ?? "").length <= 1 && frame.call.length < frame.call_short.length + 7

    const expanded = expanded_state || (frame.call === frame.call_short && frame.func === funcname_args(frame.call)[0]) || silly_to_hide

    if (ignore_funccall(frame)) return null

    const call = expanded ? frame.call : frame.call_short

    const call_funcname_args = funcname_args(call)
    const funcname = expanded ? call_funcname_args[0] : frame.func

    // if function name is #12 or #15#16 then it is an anonymous function

    const funcname_display = funcname.match(/^#\d+(#\d+)?$/)
        ? html`<abbr title="A (mini-)function that is defined without the 'function' keyword, but using -> or 'do'.">anonymous function</abbr>`
        : funcname

    let inner = html`<strong>${funcname_display}</strong><${HighlightCallArgumentNames} code=${call_funcname_args[1]} />`

    const id = useMemo(() => Math.random().toString(36).substring(7), [frame])

    return html`<mark id=${id}>${inner}</mark> ${!expanded
            ? html`<a
                  aria-expanded=${expanded}
                  aria-controls=${id}
                  title="Display the complete type information of this function call"
                  role="button"
                  href="#"
                  onClick=${(e) => {
                      e.preventDefault()
                      set_expanded(true)
                  }}
                  >...show types...</a
              >`
            : null}`
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
            delete code_ref.current.dataset.highlighted
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

const HighlightCallArgumentNames = ({ code }) => {
    const code_ref = useRef(/** @type {HTMLPreElement?} */ (null))
    useLayoutEffect(() => {
        if (code_ref.current) {
            const html = code.replaceAll(/([^():{},; ]*)::/g, "<span class='argument_name'>$1</span>::")

            code_ref.current.innerHTML = html
        }
    }, [code_ref.current, code])

    return html`<s-span ref=${code_ref} class="language-julia"></s-span>`
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
                                class="from_this_notebook from_this_cell important"
                                onmouseenter=${() =>
                                    // NOTE: this could be moved move to `StackFrameFilename`
                                    window.dispatchEvent(new CustomEvent("cell_highlight_range", { detail: { cell_id, from, to } }))}
                                onmouseleave=${() =>
                                    window.dispatchEvent(new CustomEvent("cell_highlight_range", { detail: { cell_id, from: null, to: null } }))}
                            >
                                <div class="classical-frame">
                                    ${message}
                                    <div class="frame-source">${at}<${StackFrameFilename} frame=${{ file: "#==#" + cell_id, line }} cell_id=${cell_id} /></div>
                                </div>
                            </li>`
                    )}
                </ol>
            </section>
        </jlerror>
    `
}

const frame_is_important_heuristic = (frame, frame_index, limited_stacktrace, frame_cell_id) => {
    if (frame_cell_id != null) return true

    const [funcname, params] = funcname_args(frame.call)

    if (["_collect", "collect_similar", "iterate", "error", "macro expansion"].includes(funcname)) {
        return false
    }

    if (funcname.includes("throw")) return false

    // too sciency
    if (frame.inlined) return false

    if (params == null) {
        // no type signature... must be some function call that got optimized away or something special
        // probably not directly relevant
        return false
    }

    if ((funcname.match(/#/g) ?? "").length >= 2) {
        // anonymous function: #plot#142
        return false
    }

    return true
}

const AnsiUpLine = (/** @type {{value: string}} */ { value }) => {
    const node_ref = useRef(/** @type {HTMLElement?} */ (null))

    const did_ansi_up = useRef(false)

    useLayoutEffect(() => {
        if (!node_ref.current) return
        node_ref.current.innerHTML = new AnsiUp().ansi_to_html(value)
        did_ansi_up.current = true
    }, [node_ref.current, value])

    // placeholder while waiting for AnsiUp to render, to prevent layout flash
    const without_ansi_chars = value.replace(/\u001b\[[0-9;]*m/g, "")

    return value === "" ? html`<p><br /></p>` : html`<p ref=${node_ref}>${did_ansi_up.current ? null : without_ansi_chars}</p>`
}

export const ErrorMessage = ({ msg, stacktrace, cell_id }) => {
    let pluto_actions = useContext(PlutoActionsContext)
    const default_rewriter = {
        pattern: /.?/,
        display: (/** @type{string} */ x) => _.dropRightWhile(x.split("\n"), (s) => s === "").map((line) => html`<${AnsiUpLine} value=${line} />`),
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
            pattern: /Multiple definitions for (.*)/,
            display: (/** @type{string} */ x) =>
                x.split("\n").map((line) => {
                    const match = line.match(/Multiple definitions for (.*)/)

                    if (match) {
                        // replace: remove final dot
                        let syms_string = match[1].replace(/\.$/, "")
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
            pattern: /^UndefVarError: (.*) not defined/,
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
        {
            pattern: /^ArgumentError: Package (.*) not found in current path/,
            display: (/** @type{string} */ x) => {
                const match = x.match(/^ArgumentError: Package (.*) not found in current path/)
                const package_name = (match?.[1] ?? "").replaceAll("`", "")

                const pkg_terminal_value = pluto_actions.get_notebook()?.nbpkg?.terminal_outputs?.[package_name]

                return html`<p>The package <strong>${package_name}.jl</strong> could not load because it failed to initialize.</p>
                    <p>That's not nice! Things you could try:</p>
                    <ul>
                        <li>Restart the notebook.</li>
                        <li>Try a different Julia version.</li>
                        <li>Contact the developers of ${package_name}.jl about this error.</li>
                    </ul>
                    <p>You might find useful information in the package installation log:</p>
                    <${PkgTerminalView} value=${pkg_terminal_value} />`
            },
            show_stacktrace: () => false,
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

    const first_package = get_first_package(limited_stacktrace)

    return html`<jlerror>
        <div class="error-header">
            <secret-h1>Error message${first_package == null ? null : ` from ${first_package}`}</secret-h1>
            <!-- <p>This message was included with the error:</p> -->
        </div>

        <header>${matched_rewriter.display(msg)}</header>
        ${stacktrace.length == 0 || !(matched_rewriter.show_stacktrace?.() ?? true)
            ? null
            : html`<section>
                  <div class="stacktrace-header">
                      <secret-h1>Stack trace</secret-h1>
                      <p>Here is what happened, the most recent locations are first:</p>
                  </div>

                  <ol>
                      ${limited_stacktrace.map((frame, frame_index) => {
                          const frame_cell_id = extract_cell_id(frame.file)
                          const from_this_notebook = frame_cell_id != null
                          const from_this_cell = cell_id === frame_cell_id
                          const important = frame_is_important_heuristic(frame, frame_index, limited_stacktrace, frame_cell_id)

                          return html`<li class=${cl({ from_this_notebook, from_this_cell, important })}>
                              <div class="classical-frame">
                                  <${Funccall} frame=${frame} />
                                  <div class="frame-source">
                                      ${at}<${StackFrameFilename} frame=${frame} cell_id=${cell_id} />
                                      <${DocLink} frame=${frame} />
                                  </div>
                              </div>
                              ${from_this_notebook ? html`<${LinePreview} frame=${frame} num_context_lines=${from_this_cell ? 1 : 2} />` : null}
                          </li>`
                      })}
                      ${limited
                          ? html`<li class="important">
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
        <${Motivation} stacktrace=${stacktrace} />
    </jlerror>`
}

const get_first_package = (limited_stacktrace) => {
    for (let [i, frame] of limited_stacktrace.entries()) {
        const frame_cell_id = extract_cell_id(frame.file)
        if (frame_cell_id) return undefined

        const important = frame_is_important_heuristic(frame, i, limited_stacktrace, frame_cell_id)
        if (!important) continue

        if (frame.source_package) return frame.source_package
    }
}

const motivational_word_probability = 0.1
const motivational_words = [
    //
    "Don't panic!",
    "Keep calm, you got this!",
    "You got this!",
    "Silly computer!",
    "Silly computer!",
    "beep boop CRASH 🤖",
    "computer bad, you GREAT!",
    "Probably not your fault!",
    "Try asking on Julia Discourse!",
    "uhmmmmmm??!",
    "Maybe time for a break? ☕️",
    "Everything is going to be okay!",
    "Computers are hard!",
    "C'est la vie !",
    "¯\\_(ツ)_/¯",
    "Oh no! 🙀",
    "this suckz 💣",
    "Be patient :)",
]

const Motivation = ({ stacktrace }) => {
    const msg = useMemo(() => {
        return Math.random() < motivational_word_probability ? motivational_words[Math.floor(Math.random() * motivational_words.length)] : null
    }, [stacktrace])

    return msg == null ? null : html`<div class="dont-panic">${msg}</div>`
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
