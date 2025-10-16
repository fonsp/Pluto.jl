import { html, useRef, useLayoutEffect, useState, useEffect, useCallback } from "../imports/Preact.js"
import { has_ctrl_or_cmd_pressed } from "../common/KeyboardShortcuts.js"
import _ from "../imports/lodash.js"

// @ts-ignore
import { default as toml_lib } from "https://cdn.jsdelivr.net/npm/smol-toml@1.3.0/dist/index.js"

import {
    EditorState,
    EditorSelection,
    EditorView,
    placeholder as Placeholder,
    keymap,
    history,
    autocomplete,
    drawSelection,
    Compartment,
    StateEffect,
    StreamLanguage,
    toml,
    highlightSpecialChars,
    lineNumbers,
    indentOnInput,
    closeBrackets,
    rectangularSelection,
    indentUnit,
    defaultHighlightStyle,
    syntaxHighlighting,
    syntaxTree,
    linter,
    historyKeymap,
    defaultKeymap,
} from "../imports/CodemirrorPlutoSetup.js"
let { autocompletion, completionKeymap } = autocomplete

//@ts-ignore
import immer from "../imports/immer.js"
import { useDialog } from "../common/useDialog.js"
import { FeaturedCard } from "./welcome/FeaturedCard.js"
import { useEventListener } from "../common/useEventListener.js"
import { tab_help_plugin } from "./CellInput/tab_help_plugin.js"
import { pluto_syntax_color_any, pluto_syntax_colors_julia } from "./CellInput.js"
import { awesome_line_wrapping } from "./CellInput/awesome_line_wrapping.js"

/**
 * @param {{
 *  notebook: import("./Editor.js").NotebookData,
 *  remote_project_toml: Record<String,any>?,
 *  set_remote_project_toml: (newval: Record<String,any>) => Promise<void>,
 * }} props
 * */
export const ProjectTomlEditor = ({ notebook, remote_project_toml, set_remote_project_toml }) => {
    const [project_toml, set_project_toml] = useState(remote_project_toml ?? {})

    useEffect(() => {
        set_project_toml(remote_project_toml ?? {})
    }, [remote_project_toml])

    const [dialog_ref, open, close, _toggle] = useDialog()

    const cancel = () => {
        set_project_toml(remote_project_toml ?? {})
        close()
    }

    const set_remote_project_toml_ref = useRef(set_remote_project_toml)
    set_remote_project_toml_ref.current = set_remote_project_toml

    const submit = useCallback(() => {
        set_remote_project_toml_ref.current(project_toml).then(() => alert("Project TOML synchronized ✔\n\nThese parameters will be used in future exports."))
        close()
    }, [project_toml, close])

    useEventListener(window, "open pluto project toml editor", open, [open])

    useEventListener(
        window,
        "keydown",
        (e) => {
            if (dialog_ref.current != null) if (dialog_ref.current.contains(e.target)) if (e.key === "Enter" && has_ctrl_or_cmd_pressed(e)) submit()
        },
        [submit]
    )

    const cm = useRef(/** @type {EditorView?} */ (null))
    const base = useRef(/** @type {any} */ (null))

    const nbpkg_ref = useRef(notebook.nbpkg)
    nbpkg_ref.current = notebook.nbpkg
    const get_nbpkg = () => nbpkg_ref.current

    useLayoutEffect(() => {
        const usesDarkTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        cm.current = new EditorView({
            state: EditorState.create({
                doc: `name = "Example"
description = ""
authors = ["Fons van der Plas"]
version = "1.30.2"

[deps]
FileIO = "5789e2e9-d7fb-5bc7-8068-2c6fae9b9549"
Images = "916415d5-f1e6-5110-898d-aaa5f9f070e0"
Plots = "91a5bcdd-55d7-5caf-9e0b-520d859cae80"
PlutoUI = "7f904dfe-b85e-4ff6-b463-dae2292396a8"

[compat]
FileIO = "~1.15.0"
Images = "~0.25.2"
Plots = "~1.31.7"
PlutoUI = "~0.7.40"

[sources]
PlutoUI = { path = "~/Documents/Pluto.jl", rev="some-branch-i-want-to-use" }
`,
                extensions: [
                    lineNumbers(),
                    highlightSpecialChars(),
                    history(),
                    drawSelection(),
                    EditorState.allowMultipleSelections.of(true),
                    // Multiple cursors with `alt` instead of the default `ctrl` (which we use for go to definition)
                    EditorView.clickAddsSelectionRange.of((event) => event.altKey && !event.shiftKey),
                    indentOnInput(),
                    EditorState.languageData.of((state, pos, side) => {
                        return [{ closeBrackets: { brackets: ["(", "[", "{"] } }]
                    }),
                    closeBrackets(),
                    rectangularSelection({
                        eventFilter: (e) => e.altKey && e.shiftKey && e.button == 0,
                    }),
                    StreamLanguage.define(toml),
                    EditorState.tabSize.of(4),
                    indentUnit.of("    "),
                    syntaxHighlighting(pluto_syntax_color_any),
                    // syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                    awesome_line_wrapping,
                    EditorView.lineWrapping,

                    EditorView.theme(
                        {
                            "&": {
                                fontSize: "inherit",
                            },
                            ".cm-scroller": {
                                fontFamily: "inherit",
                                overflowY: "hidden",
                                overflowX: "auto",
                            },
                        },
                        { dark: usesDarkTheme }
                    ),
                    // EditorView.updateListener.of(onCM6Update),

                    Placeholder("This is a TOML file. You can set metadata for your project here."),
                    regexpLinter(get_nbpkg),
                    autocompletion({
                        activateOnTyping: true,
                        override: [complete_anyword, complete_package_names(get_nbpkg)],
                        defaultKeymap: false, // We add these manually later, so we can override them if necessary
                        maxRenderedOptions: 512, // fons's magic number
                        optionClass: (c) => c.type ?? "",
                    }),
                    keymap.of([...defaultKeymap, ...completionKeymap, ...historyKeymap]),

                    tab_help_plugin,
                ],
            }),
        })
        const current_cm = cm.current
        base.current.insertBefore(current_cm.dom, base.current.firstElementChild)
    }, [])

    return html`<dialog ref=${dialog_ref} class="pluto-modal pluto-frontmatter pluto-project_toml">
        <h1>Project.toml</h1>
        <p>
            If you are publishing this notebook on the web, you can set the parameters below to provide HTML metadata. This is useful for search engines and
            social media.
        </p>
        <div class="project_toml_cm" ref=${base}></div>

        <div class="final"><button onClick=${cancel}>Cancel</button><button onClick=${submit}>Save</button></div>
    </dialog>`
}

const regexpLinter = (/** @type {() => import("./Editor.js").NotebookPkgData?} */ get_nbpkg) =>
    linter((view) => {
        /** @type {import("../imports/CodemirrorPlutoSetup.js").Diagnostic[]} */
        let diagnostics = []
        syntaxTree(view.state)
            .cursor()
            .iterate((node) => {
                if (node.name !== "propertyName") return
                const sec = current_toml_section(view.state, node.from)
                if (sec !== "deps" && sec !== "compat" && sec !== "sources") return
                const name = view.state.sliceDoc(node.from, node.to)

                const pkg = get_nbpkg()
                if (pkg == null) return

                if (pkg.installed_versions[name] != null) return

                diagnostics.push({
                    from: node.from,
                    to: node.to,
                    severity: "warning",
                    message: `Package ${name} is not installed`,
                    // actions: [
                    //     {
                    //         name: "Remove",
                    //         apply(view, from, to) {
                    //             view.dispatch({ changes: { from, to } })
                    //         },
                    //     },
                    // ],
                })
            })
        return diagnostics
    })

const current_toml_section = (/** @type {EditorState} */ state, pos) => {
    const before = state.sliceDoc(0, pos)
    const sections = [...before.matchAll(/^\[([^\]]*)\]/gm)]
    if (sections.length === 0) return null
    return sections[sections.length - 1][1]
}

const complete_package_names =
    (/** @type {() => import("./Editor.js").NotebookPkgData?} */ get_nbpkg) => async (/** @type {autocomplete.CompletionContext} */ ctx) => {
        const sec = current_toml_section(ctx.state, ctx.pos)
        console.log(sec)
        if (!(sec === "deps" || sec === "compat" || sec === "sources")) return null

        const pkg = get_nbpkg()
        console.log(pkg)

        if (pkg == null) return null

        return autocomplete.completeFromList(Object.keys(pkg.installed_versions))(ctx)
    }
const complete_anyword = async (/** @type {autocomplete.CompletionContext} */ ctx) => {
    let node = syntaxTree(ctx.state).resolve(ctx.pos, -1)
    console.log(node)

    return null
    console.log("before ", current_toml_section(ctx.state, ctx.pos))
    // if (match_latex_symbol_complete(ctx)) return null
    // if (!ctx.explicit && writing_variable_name_or_keyword(ctx)) return null
    // if (!ctx.explicit && ctx.tokenBefore(["Number", "Comment", "String", "TripleString", "Symbol"]) != null) return null

    const results_from_cm = await autocomplete.completeAnyWord(ctx)
    if (results_from_cm === null) return null

    // const last_token = ctx.tokenBefore(["Identifier", "Number"])
    // if (last_token == null || last_token.type?.name === "Number") return null

    return {
        from: results_from_cm.from,
        // commitCharacters: julia_commit_characters(ctx),

        options: results_from_cm.options,
    }
}
