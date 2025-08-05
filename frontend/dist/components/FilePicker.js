"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilePicker = void 0;
const Preact_js_1 = require("../imports/Preact.js");
const UnicodeTools_js_1 = require("../common/UnicodeTools.js");
const KeyboardShortcuts_js_1 = require("../common/KeyboardShortcuts.js");
const CodemirrorPlutoSetup_js_1 = require("../imports/CodemirrorPlutoSetup.js");
const NotebookLocationFromURL_js_1 = require("../common/NotebookLocationFromURL.js");
const tab_help_plugin_js_1 = require("./CellInput/tab_help_plugin.js");
const lodash_js_1 = __importDefault(require("../imports/lodash.js"));
let { autocompletion, completionKeymap } = CodemirrorPlutoSetup_js_1.autocomplete;
let start_autocomplete_command = completionKeymap.find((keybinding) => keybinding.key === "Ctrl-Space");
let accept_autocomplete_command = completionKeymap.find((keybinding) => keybinding.key === "Enter");
let close_autocomplete_command = completionKeymap.find((keybinding) => keybinding.key === "Escape");
const assert_not_null = (x) => {
    if (x == null) {
        throw new Error("Unexpected null value");
    }
    else {
        return x;
    }
};
const set_cm_value = (/** @type{EditorView} */ cm, /** @type {string} */ value, scroll = true) => {
    cm.dispatch({
        changes: { from: 0, to: cm.state.doc.length, insert: value },
        selection: CodemirrorPlutoSetup_js_1.EditorSelection.cursor(value.length),
        // a long path like /Users/fons/Documents/article-test-1/asdfasdfasdfsadf.jl does not fit in the little box, so we scroll it to the left so that you can see the filename easily.
        scrollIntoView: scroll,
    });
};
const is_desktop = !!window.plutoDesktop;
if (is_desktop) {
    console.log("Running in Desktop Environment! Found following properties/methods:", window.plutoDesktop);
}
/**
 * @param {{
 *  value: String,
 *  suggest_new_file: {base: String},
 *  button_label: String,
 *  placeholder: String,
 *  on_submit: (new_path: String) => Promise<void>,
 *  on_desktop_submit?: (loc?: string) => Promise<void>,
 *  client: import("../common/PlutoConnection.js").PlutoConnection,
 *  clear_on_blur: Boolean,
 * }} props
 */
const FilePicker = ({ value, suggest_new_file, button_label, placeholder, on_submit, on_desktop_submit, client, clear_on_blur }) => {
    const [is_button_disabled, set_is_button_disabled] = (0, Preact_js_1.useState)(true);
    const [url_value, set_url_value] = (0, Preact_js_1.useState)("");
    const forced_value = (0, Preact_js_1.useRef)("");
    /** @type {import("../imports/Preact.js").Ref<HTMLElement>} */
    const base = (0, Preact_js_1.useRef)(/** @type {any} */ (null));
    const cm = (0, Preact_js_1.useRef)(/** @type {EditorView?} */ (null));
    const suggest_not_tmp = () => {
        const current_cm = cm.current;
        if (current_cm == null)
            return;
        if (suggest_new_file != null && current_cm.state.doc.length === 0) {
            // current_cm.focus()
            set_cm_value(current_cm, suggest_new_file.base, false);
            request_path_completions();
        }
        window.dispatchEvent(new CustomEvent("collapse_cell_selection", {}));
    };
    let run = async (fn) => await fn();
    const onSubmit = () => {
        const current_cm = cm.current;
        if (current_cm == null)
            return;
        if (!is_desktop) {
            const my_val = current_cm.state.doc.toString();
            if (my_val === forced_value.current) {
                suggest_not_tmp();
                return true;
            }
        }
        run(async () => {
            try {
                if (is_desktop && on_desktop_submit) {
                    await on_desktop_submit((await (0, NotebookLocationFromURL_js_1.guess_notebook_location)(url_value)).path_or_url);
                }
                else {
                    await on_submit(current_cm.state.doc.toString());
                }
                current_cm.dom.blur();
            }
            catch (error) {
                set_cm_value(current_cm, forced_value.current, true);
                current_cm.dom.blur();
            }
        });
        return true;
    };
    const onBlur = (e) => {
        const still_in_focus = base.current?.matches(":focus-within") || base.current?.contains(e.relatedTarget);
        if (still_in_focus)
            return;
        const current_cm = cm.current;
        if (current_cm == null)
            return;
        if (clear_on_blur)
            requestAnimationFrame(() => {
                if (!current_cm.hasFocus) {
                    set_cm_value(current_cm, forced_value.current, true);
                }
            });
    };
    const request_path_completions = () => {
        const current_cm = cm.current;
        if (current_cm == null)
            return;
        let selection = current_cm.state.selection.main;
        if (selection.from !== selection.to)
            return;
        if (current_cm.state.doc.length !== selection.to)
            return;
        return assert_not_null(start_autocomplete_command).run(current_cm);
    };
    (0, Preact_js_1.useLayoutEffect)(() => {
        const usesDarkTheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const keyMapSubmit = () => {
            onSubmit();
            return true;
        };
        cm.current = new CodemirrorPlutoSetup_js_1.EditorView({
            state: CodemirrorPlutoSetup_js_1.EditorState.create({
                doc: "",
                extensions: [
                    (0, CodemirrorPlutoSetup_js_1.drawSelection)(),
                    CodemirrorPlutoSetup_js_1.EditorView.domEventHandlers({
                        focus: (event, cm) => {
                            setTimeout(() => {
                                if (suggest_new_file) {
                                    suggest_not_tmp();
                                }
                                else {
                                    request_path_completions();
                                }
                            }, 0);
                            return true;
                        },
                    }),
                    CodemirrorPlutoSetup_js_1.EditorView.updateListener.of((update) => {
                        if (update.docChanged) {
                            set_is_button_disabled(update.state.doc.length === 0);
                        }
                    }),
                    CodemirrorPlutoSetup_js_1.EditorView.theme({
                        "&": {
                            fontSize: "inherit",
                        },
                        ".cm-scroller": {
                            fontFamily: "inherit",
                            overflowY: "hidden",
                            overflowX: "auto",
                        },
                    }, { dark: usesDarkTheme }),
                    // EditorView.updateListener.of(onCM6Update),
                    (0, CodemirrorPlutoSetup_js_1.history)(),
                    autocompletion({
                        activateOnTyping: true,
                        override: [
                            pathhints({
                                suggest_new_file: suggest_new_file,
                                client: client,
                            }),
                        ],
                        defaultKeymap: false, // We add these manually later, so we can override them if necessary
                        maxRenderedOptions: 512, // fons's magic number
                        optionClass: (c) => c.type ?? "",
                    }),
                    // When a completion is picked, immediately start autocompleting again
                    CodemirrorPlutoSetup_js_1.EditorView.updateListener.of((update) => {
                        update.transactions.forEach((transaction) => {
                            const completion = transaction.annotation(CodemirrorPlutoSetup_js_1.autocomplete.pickedCompletion);
                            if (completion != null) {
                                update.view.dispatch({
                                    effects: CodemirrorPlutoSetup_js_1.EditorView.scrollIntoView(update.state.doc.length),
                                    selection: CodemirrorPlutoSetup_js_1.EditorSelection.cursor(update.state.doc.length),
                                });
                                request_path_completions();
                            }
                        });
                    }),
                    CodemirrorPlutoSetup_js_1.keymap.of([
                        {
                            key: "Enter",
                            run: (cm) => {
                                // If there is autocomplete open, accept that. It will return `true`
                                return assert_not_null(accept_autocomplete_command).run(cm);
                            },
                        },
                        {
                            key: "Enter",
                            run: keyMapSubmit,
                        },
                        {
                            key: "Ctrl-Enter",
                            mac: "Cmd-Enter",
                            run: keyMapSubmit,
                        },
                        {
                            key: "Ctrl-Shift-Enter",
                            mac: "Cmd-Shift-Enter",
                            run: keyMapSubmit,
                        },
                        {
                            key: "Tab",
                            run: (cm) => {
                                // If there is autocomplete open, accept that
                                if (assert_not_null(accept_autocomplete_command).run(cm)) {
                                    // and request the next ones
                                    request_path_completions();
                                    return true;
                                }
                                // Else, activate it (possibly)
                                return request_path_completions();
                            },
                        },
                    ]),
                    CodemirrorPlutoSetup_js_1.keymap.of(completionKeymap),
                    (0, CodemirrorPlutoSetup_js_1.placeholder)(placeholder),
                    tab_help_plugin_js_1.tab_help_plugin,
                ],
            }),
        });
        const current_cm = cm.current;
        if (!is_desktop)
            base.current.insertBefore(current_cm.dom, base.current.firstElementChild);
        // window.addEventListener("resize", () => {
        //     if (!cm.current.hasFocus()) {
        //         deselect(cm.current)
        //     }
        // })
    }, []);
    (0, Preact_js_1.useLayoutEffect)(() => {
        if (forced_value.current != value) {
            if (cm.current == null)
                return;
            set_cm_value(cm.current, value, true);
            forced_value.current = value;
        }
    });
    return is_desktop
        ? (0, Preact_js_1.html) `<div class="desktop_picker_group" ref=${base}>
              <input
                  value=${url_value}
                  placeholder="Enter notebook URL..."
                  onChange=${(v) => {
            set_url_value(v.target.value);
        }}
              />
              <div onClick=${onSubmit} class="desktop_picker">
                  <button>${button_label}</button>
              </div>
          </div>`
        : (0, Preact_js_1.html) `
              <pluto-filepicker ref=${base} onfocusout=${onBlur}>
                  <button onClick=${onSubmit} disabled=${is_button_disabled}>${button_label}</button>
              </pluto-filepicker>
          `;
};
exports.FilePicker = FilePicker;
const dirname = (/** @type {string} */ str) => {
    // using regex /\/|\\/
    const idx = [...str.matchAll(/[\/\\]/g)].map((r) => r.index);
    return idx.length > 0 ? str.slice(0, lodash_js_1.default.last(idx) + 1) : str;
};
const basename = (/** @type {string} */ str) => (str.split("/").pop() ?? "").split("\\").pop() ?? "";
const pathhints = ({ client, suggest_new_file }) => 
/** @type {autocomplete.CompletionSource} */
(ctx) => {
    const query_full = /** @type {String} */ (ctx.state.sliceDoc(0, ctx.pos));
    const query = dirname(query_full);
    return client
        .send("completepath", {
        query,
    })
        .then((update) => {
        const queryFileName = basename(query_full);
        const results = update.message.results;
        const from = (0, UnicodeTools_js_1.utf8index_to_ut16index)(query, update.message.start);
        // if the typed text matches one of the paths exactly, stop autocomplete immediately.
        if (results.includes(queryFileName)) {
            return null;
        }
        let styledResults = results.map((r) => {
            let dir = r.endsWith("/") || r.endsWith("\\");
            return {
                label: r,
                type: dir ? "dir" : "file",
                boost: dir ? 1 : 0,
            };
        });
        if (suggest_new_file != null) {
            for (let initLength = 3; initLength >= 0; initLength--) {
                const init = ".jl".substring(0, initLength);
                if (queryFileName.endsWith(init)) {
                    let suggestedFileName = queryFileName + ".jl".substring(initLength);
                    if (suggestedFileName == ".jl") {
                        suggestedFileName = "notebook.jl";
                    }
                    if (initLength == 3) {
                        return null;
                    }
                    if (!results.includes(suggestedFileName)) {
                        styledResults.push({
                            label: suggestedFileName + " (new)",
                            apply: suggestedFileName,
                            type: "file new",
                            boost: -99,
                        });
                    }
                    break;
                }
            }
        }
        const validFor = (/** @type {string} */ text) => {
            return (/[\p{L}\p{Nl}\p{Sc}\d_!-\.]*$/u.test(text) &&
                // if the typed text matches one of the paths exactly, stop autocomplete immediately.
                !results.includes(basename(text)));
        };
        return {
            options: styledResults,
            from: from,
            validFor,
        };
    });
};
