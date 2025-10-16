import { html, useRef, useLayoutEffect, useState, useEffect, useCallback, useContext } from "../imports/Preact.js"
import { has_ctrl_or_cmd_pressed } from "../common/KeyboardShortcuts.js"
import _ from "../imports/lodash.js"

// @ts-ignore
import semver from "https://esm.sh/semver@7.6.3"

import {
    EditorState,
    EditorView,
    placeholder as Placeholder,
    keymap,
    history,
    autocomplete,
    drawSelection,
    StreamLanguage,
    toml,
    highlightSpecialChars,
    lineNumbers,
    indentOnInput,
    closeBrackets,
    rectangularSelection,
    indentUnit,
    syntaxHighlighting,
    syntaxTree,
    linter,
    historyKeymap,
    defaultKeymap,
    ViewPlugin,
    Decoration,
} from "../imports/CodemirrorPlutoSetup.js"
let { autocompletion, completionKeymap } = autocomplete

//@ts-ignore
import { useDialog } from "../common/useDialog.js"
import { useEventListener } from "../common/useEventListener.js"
import { tab_help_plugin } from "./CellInput/tab_help_plugin.js"
import { pluto_syntax_color_any } from "./CellInput.js"
import { awesome_line_wrapping } from "./CellInput/awesome_line_wrapping.js"
import { PlutoActionsContext } from "../common/PlutoContext.js"
import { ReactWidget } from "./CellInput/ReactWidget.js"
import { set_cm_value } from "./FilePicker.js"

/**
 * @param {{
 *  notebook: import("./Editor.js").NotebookData,
 *  remote_project_toml: String?,
 *  set_remote_project_toml: (newval: String) => Promise<void>,
 * }} props
 * */
export const ProjectTomlEditor = ({ notebook, remote_project_toml, set_remote_project_toml }) => {
    let pluto_actions = useContext(PlutoActionsContext)

    const cm = useRef(/** @type {EditorView?} */ (null))
    const base = useRef(/** @type {any} */ (null))

    const [dialog_ref, open, close, _toggle] = useDialog()

    const cancel = () => {
        const view = cm.current
        if (view != null) {
            set_cm_value(view, remote_project_toml ?? "")
        }
        close()
    }

    useEffect(() => {
        const view = cm.current
        if (view != null) {
            set_cm_value(view, remote_project_toml ?? "")
        }
    }, [remote_project_toml])

    const set_remote_project_toml_ref = useRef(set_remote_project_toml)
    set_remote_project_toml_ref.current = set_remote_project_toml

    const submit = useCallback(() => {
        const view = cm.current
        if (view == null) return
        set_remote_project_toml_ref
            .current(view.state.doc.toString())
            .then(() => alert("Project TOML synchronized ✔\n\nThese parameters will be used in future exports."))
        close()
    }, [close])

    useEventListener(window, "open pluto project toml editor", open, [open])

    useEventListener(
        window,
        "keydown",
        (e) => {
            if (dialog_ref.current != null) if (dialog_ref.current.contains(e.target)) if (e.key === "Enter" && has_ctrl_or_cmd_pressed(e)) submit()
        },
        [submit]
    )

    const nbpkg_ref = useRef(notebook.nbpkg)
    nbpkg_ref.current = notebook.nbpkg
    const get_nbpkg = () => nbpkg_ref.current

    useLayoutEffect(() => {
        const usesDarkTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        cm.current = new EditorView({
            state: EditorState.create({
                doc: remote_project_toml ?? "",
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
                    // regexpLinter(get_nbpkg),
                    autocompletion({
                        activateOnTyping: true,

                        override: [
                            //

                            complete_remote_package_names(async (query) => (await pluto_actions?.send("package_completions", { query }))?.message?.results),
                            complete_uuids(get_nbpkg, pluto_actions?.get_avaible_versions),
                            complete_versions(get_nbpkg, pluto_actions?.get_avaible_versions),
                        ],
                        activateOnCompletion: (completion) => completion.label.endsWith(" "),

                        defaultKeymap: false, // We add these manually later, so we can override them if necessary
                        maxRenderedOptions: 512, // fons's magic number
                        optionClass: (c) => c.type ?? "",
                    }),
                    keymap.of([...defaultKeymap, ...completionKeymap, ...historyKeymap]),

                    update_button_decorations(pluto_actions?.get_avaible_versions),

                    tab_help_plugin,
                ],
            }),
        })
        const current_cm = cm.current
        base.current.insertBefore(current_cm.dom, base.current.firstElementChild)
    }, [])

    return html`<dialog ref=${dialog_ref} class="pluto-modal pluto-frontmatter pluto-project_toml">
        <h1>Project.toml</h1>
        <p>Here you can edit the Project.toml file for this notebook. <a href="https://pkgdocs.julialang.org/v1/compatibility/">Learn more →</a></p>
        <div class="project_toml_cm" ref=${base}></div>

        <div class="final"><button onClick=${cancel}>Cancel</button><button onClick=${submit}>Save</button></div>
    </dialog>`
}

// TODO: this does not work for new packaes... maybe not useful.
// const regexpLinter = (/** @type {() => import("./Editor.js").NotebookPkgData?} */ get_nbpkg) =>
//     linter((view) => {
//         /** @type {import("../imports/CodemirrorPlutoSetup.js").Diagnostic[]} */
//         let diagnostics = []
//         syntaxTree(view.state)
//             .cursor()
//             .iterate((node) => {
//                 if (node.name !== "propertyName") return
//                 const sec = current_toml_section(view.state, node.from)
//                 if (sec !== "deps" && sec !== "compat" && sec !== "sources") return
//                 const name = view.state.sliceDoc(node.from, node.to)

//                 const pkg = get_nbpkg()
//                 if (pkg == null) return

//                 const ver = pkg.installed_versions[name]
//                 if (ver != null) return

//                 diagnostics.push({
//                     from: node.from,
//                     to: node.to,
//                     severity: "warning",
//                     message: `Package ${name} is not used in this notebook.`,
//                     // actions: [
//                     //     {
//                     //         name: "Remove",
//                     //         apply(view, from, to) {
//                     //             view.dispatch({ changes: { from, to } })
//                     //         },
//                     //     },
//                     // ],
//                 })
//             })
//         return diagnostics
//     })

const current_toml_section = (/** @type {EditorState} */ state, pos) => {
    const before = state.sliceDoc(0, pos)
    const sections = [...before.matchAll(/^\[([^\]]*)\]/gm)]
    if (sections.length === 0) return null
    return sections[sections.length - 1][1]
}

/**
 * Match something like `Dates = "~10.0`
 */
const package_str_entry_regex = /(\w+)\s*\=\s*(\"[\w-\.\=\~\>\<\^≥≤,\s]*\"?)?/

const complete_package_field = (/** @type {autocomplete.CompletionContext} */ ctx) => {
    const match = ctx.matchBefore(package_str_entry_regex)
    if (match == null) return null

    const yo = match.text.match(package_str_entry_regex)
    if (yo == null) return null
    const [package_name, partial_str] = yo.slice(1)

    const node = syntaxTree(ctx.state).resolve(ctx.pos, -1)
    if (node.name !== "string") return null

    const from = node.name === "string" ? node.from : ctx.pos
    const to = node.name === "string" ? node.to : undefined

    return { package_name, partial_str, from, to }
}

const complete_uuids =
    (/** @type {() => import("./Editor.js").NotebookPkgData?} */ get_nbpkg, get_avaible_versions) =>
    async (/** @type {autocomplete.CompletionContext} */ ctx) => {
        const sec = current_toml_section(ctx.state, ctx.pos)
        if (!(sec === "deps" || sec === "weakdeps")) return null

        const res = complete_package_field(ctx)
        if (res == null) return null
        const { package_name, partial_str, from, to } = res

        const available_versions = await get_avaible_versions({ package_name })
        if (available_versions == null) return null

        console.warn({ from, to })

        return {
            from,
            to,
            options: available_versions.uuids.map((id) => ({ label: `"${id}"`, type: "uuid" })),
        }
    }

const complete_versions =
    (/** @type {() => import("./Editor.js").NotebookPkgData?} */ get_nbpkg, get_avaible_versions) =>
    async (/** @type {autocomplete.CompletionContext} */ ctx) => {
        const sec = current_toml_section(ctx.state, ctx.pos)
        if (!(sec === "compat")) return null

        const res = complete_package_field(ctx)
        if (res == null) return null
        const { package_name, from, to } = res

        const available_versions = await get_avaible_versions({ package_name })
        if (available_versions == null) return null

        const latest = _.last(available_versions.versions)
        if (latest == "stdlib" || latest == null) return null

        return {
            from,
            to,
            options: [
                // just one option
                {
                    label: `"~${latest}"`,
                    detail: "Latest",
                },
            ],
        }
    }

const complete_used_package_names =
    (/** @type {() => import("./Editor.js").NotebookPkgData?} */ get_nbpkg) => async (/** @type {autocomplete.CompletionContext} */ ctx) => {
        const sec = current_toml_section(ctx.state, ctx.pos)
        if (!(sec === "deps" || sec === "compat" || sec === "sources")) return null

        const pkg = get_nbpkg()
        if (pkg == null) return null

        return autocomplete.completeFromList(Object.keys(pkg.installed_versions))(ctx)
    }

const complete_remote_package_names = (package_completions) => async (/** @type {autocomplete.CompletionContext} */ ctx) => {
    const sec = current_toml_section(ctx.state, ctx.pos)
    if (!(sec === "deps" || sec === "compat" || sec === "sources")) return null

    const name_token = ctx.tokenBefore(["propertyName"])
    if (name_token == null) return null

    const remote_list = await package_completions(name_token.text)
    if (remote_list == null) return null

    const at_end_of_line = ctx.state.doc.lineAt(ctx.pos).to === ctx.pos
    return autocomplete.completeFromList(remote_list.map((s) => (at_end_of_line ? `${s} = ` : s)))(ctx)
}

const julia_semver_to_npm = (julia_semver) =>
    julia_semver
        // commas become ||
        .split(",")
        .map((part) => {
            part = part.trim()
            if (part.match(/^\d/)) {
                // tilde is default
                return `^${part}`
            }
            return part
        })
        .join(" || ")

const test_julia_semver_to_npm = (a, b) => console.assert(julia_semver_to_npm(a) === b, a, b, julia_semver_to_npm(a))

test_julia_semver_to_npm("1.0", "^1.0")
test_julia_semver_to_npm("1.0.0,~1.2", "^1.0.0 || ~1.2")
test_julia_semver_to_npm("<1.0.0, 1.2", "<1.0.0 || ^1.2")
test_julia_semver_to_npm("<1.0, 12", "<1.0 || ^12")

const three_stage_update = (current_entry, available_versions) => {
    if (available_versions == null) return null
    const latest = _.last(available_versions)
    if (latest == "stdlib" || latest == null) return null

    const results = []

    results.push({
        label: `Latest (${latest})`,
        entry: `~${latest}`,
    })

    const current_semver_input = julia_semver_to_npm(current_entry.replace(/"/g, ""))
    console.log({ current_semver_input })

    if (semver.validRange(current_semver_input) != null) {
        const latest_compatible_version = semver.maxSatisfying(available_versions, current_semver_input)
        if (latest_compatible_version != null && latest_compatible_version !== latest) {
            results.push({
                label: `Latest compatible (${latest_compatible_version})`,
                entry: `~${latest_compatible_version}`,
            })
        }
    }

    return results.reverse().filter((r) => !_.isEqual(semver.validRange(r.entry), semver.validRange(current_semver_input)))
}

const UpdateWidget = ({ view, from, to, name, version, get_avaible_versions }) => {
    const [available, set_available] = useState(null)
    useEffect(() => {
        get_avaible_versions({ package_name: name }).then((res) => {
            if (res == null) return
            console.log({ r: res.versions })

            set_available(res.versions)
        })
    }, [name])

    if (available == null) {
        return html`<span>Loading...</span>`
    }

    const stages = three_stage_update(version, available)
    console.log({ stages })
    if (stages == null) return null

    return html`${stages.map(
        ({ entry, label }) => html`<button
            onClick=${() => {
                view.dispatch({
                    changes: {
                        from,
                        to,
                        insert: `"${entry}"`,
                    },
                })
            }}
        >
            ${label}
        </button>`
    )}`
}

const decs = (/** @type {EditorView} */ view, get_avaible_versions) => {
    const widgets = []

    for (let { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
            from,
            to,
            enter: (node) => {
                if (node.name == "string") {
                    const sec = current_toml_section(view.state, node.from)
                    if (sec !== "compat") return

                    const line = view.state.doc.lineAt(node.from)
                    const rematch = line.text.match(package_str_entry_regex)
                    if (rematch == null) return

                    const [name, version] = rematch.slice(1)

                    let deco = Decoration.widget({
                        // widget: new ReactWidget(html`<span style=${{ opacity: 0.2 }}>${name} at ${version}</span>`),
                        widget: new ReactWidget(html` <${UpdateWidget}
                            view=${view}
                            from=${node.from}
                            to=${node.to}
                            name=${name}
                            version=${version}
                            get_avaible_versions=${get_avaible_versions}
                        />`),
                        side: 1,
                    })
                    widgets.push(deco.range(node.to))
                }
            },
        })
    }

    return Decoration.set(widgets)
}

const update_button_decorations = (get_avaible_versions) =>
    ViewPlugin.fromClass(
        class {
            decorations

            constructor(view) {
                this.decorations = decs(view, get_avaible_versions)
            }

            update(update) {
                if (update.docChanged || update.viewportChanged || syntaxTree(update.startState) != syntaxTree(update.state))
                    this.decorations = decs(update.view, get_avaible_versions)
            }
        },
        {
            decorations: (v) => v.decorations,
        }
    )
