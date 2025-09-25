<script>
    import { onMount, onDestroy, createEventDispatcher, afterUpdate } from 'svelte';
    import { EditorState, EditorSelection, EditorView, placeholder as Placeholder, keymap, history, autocomplete, drawSelection } from "../imports/CodemirrorPlutoSetup.js";
    import { utf8index_to_ut16index } from "../common/UnicodeTools.js";
    import { tab_help_plugin } from "../components/CellInput/tab_help_plugin.js";
    import { guess_notebook_location } from "../common/NotebookLocationFromURL.js";
    import _ from "../imports/lodash.js";

    const { autocompletion, completionKeymap } = autocomplete;
    // @ts-ignore - completionKeymap type
    const start_autocomplete_command = completionKeymap.find((keybinding) => keybinding.key === "Ctrl-Space");
    // @ts-ignore - completionKeymap type
    const accept_autocomplete_command = completionKeymap.find((keybinding) => keybinding.key === "Enter");
    // @ts-ignore - completionKeymap type
    const close_autocomplete_command = completionKeymap.find((keybinding) => keybinding.key === "Escape");

    /** @type {string} */
    export let value = "";
    /** @type {any} */
    export let suggest_new_file = null;
    /** @type {string} */
    export let button_label = "";
    /** @type {string} */
    export let placeholder = "";
    /** @type {Function|null} */
    export let on_submit = null;
    /** @type {Function|null} */
    export let on_desktop_submit = null;
    /** @type {any} */
    export let client = null;
    /** @type {boolean} */
    export let clear_on_blur = false;

    /** @type {string} */
    let current_value = value;
    /** @type {string} */
    let url_value = "";
    /** @type {string} */
    let forced_value = value; // 初始值应该与value相同
    /** @type {HTMLElement|undefined} */
    let base;
    /** @type {EditorView|null} */
    let cm = null;
    /** @type {boolean} */
    let cm_initialized = false; // 添加初始化状态标记

    const is_desktop = !!window.plutoDesktop;


    $: is_button_disabled = current_value.length === 0 || current_value === forced_value;
    $: suggest_button = current_value !== forced_value && current_value.endsWith(".jl");

    const assert_not_null = (/** @type {any} */ x) => {
        if (x == null) {
            throw new Error("Unexpected null value");
        } else {
            return x;
        }
    };

    const set_cm_value = (/** @type {EditorView} */ cm, /** @type {string} */ value, /** @type {boolean} */ scroll = true) => {
        cm.dispatch({
            changes: { from: 0, to: cm.state.doc.length, insert: value },
            selection: EditorSelection.cursor(value.length),
            scrollIntoView: scroll,
        });
    };

    const suggest_not_tmp = () => {
        if (cm == null) return;
        // @ts-ignore - suggest_new_file type
        if (suggest_new_file != null && cm.state.doc.length === 0) {
            // @ts-ignore - suggest_new_file.base access
            if (suggest_new_file && suggest_new_file.base) {
                set_cm_value(cm, suggest_new_file.base, false);
                request_path_completions();
            }
        }
        window.dispatchEvent(new CustomEvent("collapse_cell_selection", {}));
    };

    const request_path_completions = () => {
        if (cm == null) return false;
        let selection = cm.state.selection.main;
        if (selection.from !== selection.to) return false;
        if (cm.state.doc.length !== selection.to) return false;
        // @ts-ignore - start_autocomplete_command type
        if (start_autocomplete_command && typeof start_autocomplete_command.run === 'function') {
            // @ts-ignore - start_autocomplete_command.run type
            return start_autocomplete_command.run(cm) || false;
        }
        return false;
    };

    const onSubmit = () => {
        if (cm == null) return false;
        if (!is_desktop) {
            const my_val = cm.state.doc.toString();
            if (my_val === forced_value) {
                suggest_not_tmp();
                return true;
            }
        }
        
        (async () => {
            try {
                if (is_desktop && on_desktop_submit) {
                    // @ts-ignore - on_desktop_submit type
                    const location = await guess_notebook_location(url_value);
                    if (location && location.path_or_url) {
                        await on_desktop_submit(location.path_or_url);
                    }
                } else if (on_submit) {
                    await on_submit(cm.state.doc.toString());
                }
                if (cm && cm.dom) {
                    cm.dom.blur();
                }
            } catch (error) {
                if (cm) {
                    set_cm_value(cm, forced_value, true);
                    if (cm.dom) {
                        cm.dom.blur();
                    }
                }
            }
        })();
        return true;
    };

    const onBlur = (/** @type {FocusEvent} */ e) => {
        const still_in_focus = base?.matches(":focus-within") || (base && e.relatedTarget instanceof Node && base.contains(e.relatedTarget));
        if (still_in_focus) return;
        if (cm == null) return;
        if (clear_on_blur) {
            requestAnimationFrame(() => {
                if (cm && !cm.hasFocus) {
                    set_cm_value(cm, forced_value, true);
                }
            });
        }
    };

    const dirname = (/** @type {string} */ str) => {
        const idx = [...str.matchAll(/[\/\\]/g)].map((r) => r.index);
        return idx.length > 0 ? str.slice(0, idx[idx.length - 1] + 1) : str;
    };

    const basename = (/** @type {string} */ str) => (str.split("/").pop() ?? "").split("\\").pop() ?? "";

    const pathhints = ({ client, suggest_new_file }) => (ctx) => {
        const query_full = ctx.state.sliceDoc(0, ctx.pos);
        const query = dirname(query_full);

        return client
            .send("completepath", { query })
            .then((update) => {
                const queryFileName = basename(query_full);
                const results = update.message.results;
                const from = utf8index_to_ut16index(query, update.message.start);

                if (results.includes(queryFileName)) {
                    return null;
                }

                let styledResults = results.map((r) => {
                    let dir = r.endsWith("/") || r.endsWith("\\");
                    return {
                        label: r,
                        type: dir ? "dir" : "file",
                        boost: dir ? 40 : 0,
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
                                    boost: 20,
                                });
                            }
                            break;
                        }
                    }
                }

                const startpos = ctx.pos;
                const validFor = (text, from, to) => {
                    return (
                        to >= startpos &&
                        /[\p{L}\p{Nl}\p{Sc}\d_!-\.]*$/u.test(text) &&
                        !results.includes(basename(text))
                    );
                };

                return {
                    options: styledResults,
                    from: from,
                    to: ctx.state.doc.length,
                    validFor: suggest_new_file ? undefined : validFor,
                };
            });
    };

    onMount(() => {
        const usesDarkTheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const keyMapSubmit = () => {
            onSubmit();
            return true;
        };

        // 确保base元素已经渲染
        if (!base) {
            console.error("Base element not found for CodeMirror initialization");
            return;
        }
        
        console.log("FilePicker: Base element found, initializing CodeMirror", base);

        const newCm = new EditorView({
            state: EditorState.create({
                doc: "", // 初始为空，后续通过afterUpdate同步
                extensions: [
                    drawSelection(),
                    EditorView.domEventHandlers({
                        focus: (event, cm) => {
                            setTimeout(() => {
                                if (suggest_new_file) {
                                    suggest_not_tmp();
                                } else {
                                    request_path_completions();
                                }
                            }, 0);
                            return true;
                        },
                    }),
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged) {
                            current_value = update.state.doc.toString();
                        }
                    }),
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
                    EditorView.contentAttributes.of({ 
                        spellcheck: "false",
                        autocorrect: "off",
                        autocapitalize: "off",
                        translate: "no",
                        role: "textbox",
                        "aria-multiline": "true",
                        "aria-autocomplete": "list",
                        tabindex: "0",
                        contenteditable: "true"
                    }),
                    history(),
                    autocompletion({
                        activateOnTyping: true,
                        override: [
                            pathhints({
                                suggest_new_file: suggest_new_file,
                                client: client,
                            }),
                        ],
                        defaultKeymap: false,
                        maxRenderedOptions: 512,
                        optionClass: (c) => c.type ?? "",
                    }),
                    EditorView.updateListener.of((update) => {
                        update.transactions.forEach((transaction) => {
                            const completion = transaction.annotation(autocomplete.pickedCompletion);
                            if (completion != null) {
                                update.view.dispatch({
                                    effects: EditorView.scrollIntoView(update.state.doc.length),
                                    selection: EditorSelection.cursor(update.state.doc.length),
                                });
                                request_path_completions();
                            }
                        });
                    }),
                    keymap.of([
                        {
                            key: "Enter",
                            run: (/** @type {EditorView} */ cm) => {
                                // @ts-ignore - accept_autocomplete_command type
                                if (accept_autocomplete_command && typeof accept_autocomplete_command.run === 'function') {
                                    // @ts-ignore - accept_autocomplete_command.run type
                                    return accept_autocomplete_command.run(cm) || false;
                                }
                                return false;
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
                            run: (/** @type {EditorView} */ cm) => {
                                // @ts-ignore - accept_autocomplete_command type
                                if (accept_autocomplete_command && typeof accept_autocomplete_command.run === 'function' && accept_autocomplete_command.run(cm)) {
                                    request_path_completions();
                                    return true;
                                }
                                const result = request_path_completions();
                                return result || false;
                            },
                        },
                    ]),
                    keymap.of(completionKeymap),
                    Placeholder(placeholder),
                    tab_help_plugin,
                ],
            }),
        });
        
        cm = newCm;

        if (!is_desktop) {
            // 延迟插入确保DOM完全就绪
            setTimeout(() => {
                if (base && cm && cm.dom) {
                    console.log("FilePicker: Inserting CodeMirror DOM into base", cm.dom);
                    base.insertBefore(cm.dom, base.firstElementChild);
                    // 确保CodeMirror的内容是可编辑的
                    const contentElement = cm.dom.querySelector('.cm-content');
                    if (contentElement) {
                        contentElement.setAttribute('contenteditable', 'true');
                        contentElement.setAttribute('tabindex', '0');
                        console.log("FilePicker: Made content element editable", contentElement);
                    }
                    // 添加focusout事件监听器
                    base.addEventListener('focusout', onBlur);
                    cm_initialized = true;
                    console.log("FilePicker: CodeMirror initialized successfully");
                    
                    // 尝试聚焦到CodeMirror以确保它是可交互的
                    setTimeout(() => {
                        if (cm && cm.hasFocus) {
                            console.log("FilePicker: Attempting to focus CodeMirror");
                            cm.focus();
                        }
                    }, 100);
                } else {
                    console.error("FilePicker: Failed to initialize CodeMirror - missing elements", {base, cm, cm_dom: cm?.dom});
                }
            }, 0);
        } else {
            cm_initialized = true;
            console.log("FilePicker: Desktop mode, CodeMirror marked as initialized");
            // 在桌面模式下也确保CodeMirror内容可编辑
            setTimeout(() => {
                if (cm && cm.dom) {
                    const contentElement = cm.dom.querySelector('.cm-content');
                    if (contentElement) {
                        contentElement.setAttribute('contenteditable', 'true');
                        contentElement.setAttribute('tabindex', '0');
                        console.log("FilePicker: Made desktop content element editable", contentElement);
                    }
                }
            }, 0);
        }
    });

    // 使用afterUpdate来确保在DOM更新后同步状态
    afterUpdate(() => {
        console.log("FilePicker: afterUpdate called", {cm: !!cm, cm_initialized, forced_value, value, should_sync: cm && cm_initialized && forced_value !== value});
        if (cm && cm_initialized && forced_value !== value) {
            console.log("FilePicker: Syncing CodeMirror value", {from: forced_value, to: value});
            set_cm_value(cm, value, true);
            forced_value = value;
        }
    });

    onDestroy(() => {
        if (cm) {
            cm.destroy();
        }
        if (base && !is_desktop) {
            base.removeEventListener('focusout', onBlur);
        }
    });
</script>

{#if is_desktop}
    <div class="desktop_picker_group" bind:this={base}>
        <input
            value={url_value}
            placeholder="Enter notebook URL..."
            on:change={(e) => {
                // @ts-ignore - Event target value access
                const target = /** @type {HTMLInputElement} */ (e.target);
                url_value = target?.value ?? "";
            }}
        />
        <button on:click={onSubmit} class="desktop_picker">
            {button_label}
        </button>
    </div>
{:else}
    <pluto-filepicker class={suggest_button ? "suggest_button" : ""} bind:this={base}>
        <button on:click={onSubmit} disabled={is_button_disabled}>{button_label}</button>
    </pluto-filepicker>
{/if}