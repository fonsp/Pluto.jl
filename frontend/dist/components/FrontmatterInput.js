"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrontMatterInput = void 0;
const Preact_js_1 = require("../imports/Preact.js");
const KeyboardShortcuts_js_1 = require("../common/KeyboardShortcuts.js");
const lodash_js_1 = __importDefault(require("../imports/lodash.js"));
require("https://cdn.jsdelivr.net/gh/fonsp/rebel-tag-input@1.0.6/lib/rebel-tag-input.mjs");
//@ts-ignore
const immer_js_1 = __importDefault(require("../imports/immer.js"));
const useDialog_js_1 = require("../common/useDialog.js");
const FeaturedCard_js_1 = require("./welcome/FeaturedCard.js");
const useEventListener_js_1 = require("../common/useEventListener.js");
/**
 * @param {{
 *  filename: String,
 *  remote_frontmatter: Record<String,any>?,
 *  set_remote_frontmatter: (newval: Record<String,any>) => Promise<void>,
 * }} props
 * */
const FrontMatterInput = ({ filename, remote_frontmatter, set_remote_frontmatter }) => {
    const [frontmatter, set_frontmatter] = (0, Preact_js_1.useState)(remote_frontmatter ?? {});
    (0, Preact_js_1.useEffect)(() => {
        set_frontmatter(remote_frontmatter ?? {});
    }, [remote_frontmatter]);
    const fm_setter = (key) => (value) => set_frontmatter((0, immer_js_1.default)((fm) => {
        lodash_js_1.default.set(fm, key, value);
    }));
    const [dialog_ref, open, close, _toggle] = (0, useDialog_js_1.useDialog)();
    const cancel = () => {
        set_frontmatter(remote_frontmatter ?? {});
        close();
    };
    const set_remote_frontmatter_ref = (0, Preact_js_1.useRef)(set_remote_frontmatter);
    set_remote_frontmatter_ref.current = set_remote_frontmatter;
    const submit = (0, Preact_js_1.useCallback)(() => {
        set_remote_frontmatter_ref
            .current(clean_data(frontmatter) ?? {})
            .then(() => alert("Frontmatter synchronized ✔\n\nThese parameters will be used in future exports."));
        close();
    }, [clean_data, frontmatter, close]);
    (0, useEventListener_js_1.useEventListener)(window, "open pluto frontmatter", open);
    (0, useEventListener_js_1.useEventListener)(window, "keydown", (e) => {
        if (dialog_ref.current != null)
            if (dialog_ref.current.contains(e.target))
                if (e.key === "Enter" && (0, KeyboardShortcuts_js_1.has_ctrl_or_cmd_pressed)(e))
                    submit();
    }, [submit]);
    const frontmatter_with_defaults = {
        title: null,
        description: null,
        date: null,
        tags: [],
        author: [{}],
        ...frontmatter,
    };
    const show_entry = ([key, value]) => !((lodash_js_1.default.isArray(value) && field_type(key) !== "tags") || lodash_js_1.default.isPlainObject(value));
    const entries_input = (data, base_path) => {
        return (0, Preact_js_1.html) `
            ${Object.entries(data)
            .filter(show_entry)
            .map(([key, value]) => {
            let path = `${base_path}${key}`;
            let id = `fm-${path}`;
            return (0, Preact_js_1.html) `
                        <label for=${id}>${key}</label>
                        <${Input} type=${field_type(key)} id=${id} value=${value} on_value=${fm_setter(path)} />
                        <button
                            class="deletefield"
                            title="Delete field"
                            aria-label="Delete field"
                            onClick=${() => {
                //  TODO
                set_frontmatter((0, immer_js_1.default)((fm) => {
                    lodash_js_1.default.unset(fm, path);
                }));
            }}
                        >
                            ✕
                        </button>
                    `;
        })}
            <button
                class="addentry"
                onClick=${() => {
            const fieldname = prompt("Field name:");
            if (fieldname) {
                set_frontmatter((0, immer_js_1.default)((fm) => {
                    lodash_js_1.default.set(fm, `${base_path}${fieldname}`, null);
                }));
            }
        }}
            >
                Add entry +
            </button>
        `;
    };
    return (0, Preact_js_1.html) `<dialog ref=${dialog_ref} class="pluto-frontmatter">
        <h1>Frontmatter</h1>
        <p>
            If you are publishing this notebook on the web, you can set the parameters below to provide HTML metadata. This is useful for search engines and
            social media.
        </p>
        <div class="card-preview" aria-hidden="true">
            <h2>Preview</h2>
            <${FeaturedCard_js_1.FeaturedCard}
                entry=${
    /** @type {import("./welcome/Featured.js").SourceManifestNotebookEntry} */ ({
        id: filename.replace(/\.jl$/, ""),
        hash: "xx",
        frontmatter: clean_data(frontmatter) ?? {},
    })}
                image_loading=${"lazy"}
                disable_links=${true}
            />
        </div>
        <div class="fm-table">
            ${entries_input(frontmatter_with_defaults, ``)}
            ${!lodash_js_1.default.isArray(frontmatter_with_defaults.author)
        ? null
        : frontmatter_with_defaults.author.map((author, i) => {
            let author_with_defaults = {
                name: null,
                url: null,
                ...author,
            };
            return (0, Preact_js_1.html) `
                          <fieldset class="fm-table">
                              <legend>Author ${i + 1}</legend>

                              ${entries_input(author_with_defaults, `author[${i}].`)}
                          </fieldset>
                      `;
        })}
            ${!lodash_js_1.default.isArray(frontmatter_with_defaults.author)
        ? null
        : (0, Preact_js_1.html) `<button
                      class="addentry"
                      onClick=${() => {
            set_frontmatter((fm) => ({ ...fm, author: [...(fm?.author ?? []), {}] }));
        }}
                  >
                      Add author +
                  </button>`}
        </div>

        <div class="final"><button onClick=${cancel}>Cancel</button><button onClick=${submit}>Save</button></div>
    </dialog>`;
};
exports.FrontMatterInput = FrontMatterInput;
const clean_data = (obj) => {
    let a = lodash_js_1.default.isPlainObject(obj)
        ? Object.fromEntries(Object.entries(obj)
            .map(([key, val]) => [key, clean_data(val)])
            .filter(([key, val]) => val != null))
        : lodash_js_1.default.isArray(obj)
            ? obj.map(clean_data).filter((x) => x != null)
            : obj;
    return !lodash_js_1.default.isNumber(a) && lodash_js_1.default.isEmpty(a) ? null : a;
};
let test = clean_data({ a: 1, b: "", c: null, d: [], e: [1, "", null, 2], f: {}, g: [{}], h: [{ z: "asdf" }] });
console.assert(lodash_js_1.default.isEqual(test, {
    a: 1,
    e: [1, 2],
    h: [{ z: "asdf" }],
}), test);
const special_field_names = ["tags", "date", "license", "url", "color"];
const field_type = (name) => {
    for (const t of special_field_names) {
        if (name === t || name.endsWith(`_${t}`)) {
            return t;
        }
    }
    return "text";
};
const Input = ({ value, on_value, type, id }) => {
    const input_ref = (0, Preact_js_1.useRef)(/** @type {HTMLInputElement?} */ (null));
    (0, Preact_js_1.useLayoutEffect)(() => {
        if (!input_ref.current)
            return;
        input_ref.current.value = value;
    }, [input_ref.current, value]);
    (0, Preact_js_1.useLayoutEffect)(() => {
        if (!input_ref.current)
            return;
        const listener = (e) => {
            if (!input_ref.current)
                return;
            on_value(input_ref.current.value);
        };
        input_ref.current.addEventListener("input", listener);
        return () => {
            input_ref.current?.removeEventListener("input", listener);
        };
    }, [input_ref.current]);
    const placeholder = type === "url" ? "https://..." : undefined;
    return type === "tags"
        ? (0, Preact_js_1.html) `<rbl-tag-input id=${id} ref=${input_ref} />`
        : type === "license"
            ? LicenseInput({ ref: input_ref, id })
            : (0, Preact_js_1.html) `<input type=${type} id=${id} ref=${input_ref} placeholder=${placeholder} />`;
};
// https://choosealicense.com/licenses/
// and check https://github.com/sindresorhus/spdx-license-list/blob/HEAD/spdx-simple.json
const code_licenses = ["AGPL-3.0", "GPL-3.0", "LGPL-3.0", "MPL-2.0", "Apache-2.0", "MIT", "BSL-1.0", "Unlicense"];
// https://creativecommons.org/about/cclicenses/
// and check https://github.com/sindresorhus/spdx-license-list/blob/HEAD/spdx-simple.json
const creative_licenses = ["CC-BY-4.0", "CC-BY-SA-4.0", "CC-BY-NC-4.0", "CC-BY-NC-SA-4.0", "CC-BY-ND-4.0", "CC-BY-NC-ND-4.0", "CC0-1.0"];
const licenses = [...code_licenses, ...creative_licenses];
const LicenseInput = ({ ref, id }) => {
    return (0, Preact_js_1.html) `
        <input ref=${ref} id=${id} type="text" list="oss-licenses" />
        <datalist id="oss-licenses">${licenses.map((name) => (0, Preact_js_1.html) `<option>${name}</option>`)}</datalist>
    `;
};
