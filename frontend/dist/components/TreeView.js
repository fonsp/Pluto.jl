"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DivElement = exports.TableView = exports.TreeView = exports.SimpleOutputBody = void 0;
const Preact_js_1 = require("../imports/Preact.js");
const CellOutput_js_1 = require("./CellOutput.js");
const PlutoContext_js_1 = require("../common/PlutoContext.js");
const useEventListener_js_1 = require("../common/useEventListener.js");
const SliderServerClient_js_1 = require("../common/SliderServerClient.js");
// this is different from OutputBody because:
// it does not wrap in <div>. We want to do that in OutputBody for reasons that I forgot (feel free to try and remove it), but we dont want it here
// i think this is because i wrote those css classes with the assumption that pluto cell output is wrapped in a div, and tree viewer contents are not
// whatever
//
// We use a `<pre>${body}` instead of `<pre><code>${body}`, also for some CSS reasons that I forgot
//
// TODO: remove this, use OutputBody instead (maybe add a `wrap_in_div` option), and fix the CSS classes so that i all looks nice again
const SimpleOutputBody = ({ mime, body, cell_id, persist_js_state, sanitize_html = true }) => {
    switch (mime) {
        case "image/png":
        case "image/jpg":
        case "image/jpeg":
        case "image/gif":
        case "image/bmp":
        case "image/svg+xml":
            return (0, Preact_js_1.html) `<${CellOutput_js_1.PlutoImage} mime=${mime} body=${body} />`;
            break;
        case "text/plain":
            // Check if the content contains ANSI escape codes
            return (0, Preact_js_1.html) `<${CellOutput_js_1.ANSITextOutput} body=${body} />`;
        case "application/vnd.pluto.tree+object":
            return (0, Preact_js_1.html) `<${exports.TreeView} cell_id=${cell_id} body=${body} persist_js_state=${persist_js_state} sanitize_html=${sanitize_html} />`;
            break;
        default:
            return (0, CellOutput_js_1.OutputBody)({ mime, body, cell_id, persist_js_state, sanitize_html, last_run_timestamp: null });
            break;
    }
};
exports.SimpleOutputBody = SimpleOutputBody;
const More = ({ on_click_more, disable }) => {
    const [loading, set_loading] = (0, Preact_js_1.useState)(false);
    const element_ref = (0, Preact_js_1.useRef)(/** @type {HTMLElement?} */ (null));
    useKeyboardClickable(element_ref);
    return (0, Preact_js_1.html) `<pluto-tree-more
        ref=${element_ref}
        tabindex=${disable ? "-1" : "0"}
        role="button"
        aria-disabled=${disable ? "true" : "false"}
        disable=${disable}
        class=${loading ? "loading" : disable ? "disabled" : ""}
        onclick=${(e) => {
        if (!loading && !disable) {
            if (on_click_more() !== false) {
                set_loading(true);
            }
        }
    }}
        >more</pluto-tree-more
    >`;
};
const useKeyboardClickable = (element_ref) => {
    (0, useEventListener_js_1.useEventListener)(element_ref, "keydown", (e) => {
        if (e.key === " ") {
            e.preventDefault();
        }
        if (e.key === "Enter") {
            e.preventDefault();
            element_ref.current.click();
        }
    }, []);
    (0, useEventListener_js_1.useEventListener)(element_ref, "keyup", (e) => {
        if (e.key === " ") {
            e.preventDefault();
            element_ref.current.click();
        }
    }, []);
};
const prefix = ({ prefix, prefix_short }) => {
    const element_ref = (0, Preact_js_1.useRef)(/** @type {HTMLElement?} */ (null));
    useKeyboardClickable(element_ref);
    return (0, Preact_js_1.html) `<pluto-tree-prefix role="button" tabindex="0" ref=${element_ref}
        ><span class="long">${prefix}</span><span class="short">${prefix_short}</span></pluto-tree-prefix
    >`;
};
const actions_show_more = ({ pluto_actions, cell_id, node_ref, objectid, dim }) => {
    const actions = pluto_actions ?? node_ref.current.closest("pluto-cell")._internal_pluto_actions;
    return actions.reshow_cell(cell_id ?? node_ref.current.closest("pluto-cell").id, objectid, dim);
};
const TreeView = ({ mime, body, cell_id, persist_js_state, sanitize_html = true }) => {
    let pluto_actions = (0, Preact_js_1.useContext)(PlutoContext_js_1.PlutoActionsContext);
    const node_ref = (0, Preact_js_1.useRef)(/** @type {HTMLElement?} */ (null));
    const onclick = (e) => {
        // TODO: this could be reactified but no rush
        let self = node_ref.current;
        if (!self)
            return;
        let clicked = e.target.closest("pluto-tree-prefix") != null ? e.target.closest("pluto-tree-prefix").parentElement : e.target;
        if (clicked !== self && !self.classList.contains("collapsed")) {
            return;
        }
        const parent_tree = self.parentElement?.closest("pluto-tree");
        if (parent_tree != null && parent_tree.classList.contains("collapsed")) {
            return; // and bubble upwards
        }
        self.classList.toggle("collapsed");
    };
    const on_click_more = () => {
        if (node_ref.current == null || node_ref.current.closest("pluto-tree.collapsed") != null) {
            return false;
        }
        return actions_show_more({
            pluto_actions,
            cell_id,
            node_ref,
            objectid: body.objectid,
            dim: 1,
        });
    };
    const more_is_noop_action = (0, SliderServerClient_js_1.is_noop_action)(pluto_actions?.reshow_cell);
    const mimepair_output = (pair) => (0, Preact_js_1.html) `<${exports.SimpleOutputBody} cell_id=${cell_id} mime=${pair[1]} body=${pair[0]} persist_js_state=${persist_js_state} sanitize_html=${sanitize_html} />`;
    const more = (0, Preact_js_1.html) `<p-r><${More} disable=${more_is_noop_action || cell_id === "cell_id_not_known"} on_click_more=${on_click_more} /></p-r>`;
    let inner = null;
    switch (body.type) {
        case "Pair":
            const r = body.key_value;
            return (0, Preact_js_1.html) `<pluto-tree-pair class=${body.type}
                ><p-r><p-k>${mimepair_output(r[0])}</p-k><p-v>${mimepair_output(r[1])}</p-v></p-r></pluto-tree-pair
            >`;
        case "circular":
            return (0, Preact_js_1.html) `<em>circular reference</em>`;
        case "Array":
        case "Set":
        case "Tuple":
            inner = (0, Preact_js_1.html) `<${prefix} prefix=${body.prefix} prefix_short=${body.prefix_short} /><pluto-tree-items class=${body.type}
                    >${body.elements.map((r) => r === "more" ? more : (0, Preact_js_1.html) `<p-r>${body.type === "Set" ? "" : (0, Preact_js_1.html) `<p-k>${r[0]}</p-k>`}<p-v>${mimepair_output(r[1])}</p-v></p-r>`)}</pluto-tree-items
                >`;
            break;
        case "Dict":
            inner = (0, Preact_js_1.html) `<${prefix} prefix=${body.prefix} prefix_short=${body.prefix_short} /><pluto-tree-items class=${body.type}
                    >${body.elements.map((r) => r === "more" ? more : (0, Preact_js_1.html) `<p-r><p-k>${mimepair_output(r[0])}</p-k><p-v>${mimepair_output(r[1])}</p-v></p-r>`)}</pluto-tree-items
                >`;
            break;
        case "NamedTuple":
            inner = (0, Preact_js_1.html) `<${prefix} prefix=${body.prefix} prefix_short=${body.prefix_short} /><pluto-tree-items class=${body.type}
                    >${body.elements.map((r) => r === "more" ? more : (0, Preact_js_1.html) `<p-r><p-k>${r[0]}</p-k><p-v>${mimepair_output(r[1])}</p-v></p-r>`)}</pluto-tree-items
                >`;
            break;
        case "struct":
            inner = (0, Preact_js_1.html) `<${prefix} prefix=${body.prefix} prefix_short=${body.prefix_short} /><pluto-tree-items class=${body.type}
                    >${body.elements.map((r) => (0, Preact_js_1.html) `<p-r><p-k>${r[0]}</p-k><p-v>${mimepair_output(r[1])}</p-v></p-r>`)}</pluto-tree-items
                >`;
            break;
    }
    return (0, Preact_js_1.html) `<pluto-tree class="collapsed ${body.type}" onclick=${onclick} ref=${node_ref}>${inner}</pluto-tree>`;
};
exports.TreeView = TreeView;
const EmptyCols = ({ colspan = 999 }) => (0, Preact_js_1.html) `<thead>
    <tr class="empty">
        <td colspan=${colspan}>
            <div>⌀ <small>(This table has no columns)</small></div>
        </td>
    </tr>
</thead>`;
const EmptyRows = ({ colspan = 999 }) => (0, Preact_js_1.html) `<tr class="empty">
    <td colspan=${colspan}>
        <div>
            <div>⌀</div>
            <small>(This table has no rows)</small>
        </div>
    </td>
</tr>`;
const TableView = ({ mime, body, cell_id, persist_js_state, sanitize_html }) => {
    let pluto_actions = (0, Preact_js_1.useContext)(PlutoContext_js_1.PlutoActionsContext);
    const node_ref = (0, Preact_js_1.useRef)(null);
    const mimepair_output = (pair) => (0, Preact_js_1.html) `<${exports.SimpleOutputBody} cell_id=${cell_id} mime=${pair[1]} body=${pair[0]} persist_js_state=${persist_js_state} sanitize_html=${sanitize_html} />`;
    const more = (dim) => (0, Preact_js_1.html) `<${More}
        on_click_more=${() => actions_show_more({
        pluto_actions,
        cell_id,
        node_ref,
        objectid: body.objectid,
        dim,
    })}
    />`;
    // More than the columns, not big enough to break Firefox (https://bugzilla.mozilla.org/show_bug.cgi?id=675417)
    const maxcolspan = 3 + (body?.schema?.names?.length ?? 1);
    const thead = (body?.schema?.names?.length ?? 0) === 0
        ? (0, Preact_js_1.html) `<${EmptyCols} colspan=${maxcolspan} />`
        : (0, Preact_js_1.html) `<thead>
                  <tr class="schema-names">
                      ${["", ...body.schema.names].map((x) => (0, Preact_js_1.html) `<th>${x === "more" ? more(2) : x}</th>`)}
                  </tr>
                  <tr class="schema-types">
                      ${["", ...body.schema.types].map((x) => (0, Preact_js_1.html) `<th>${x === "more" ? null : x}</th>`)}
                  </tr>
              </thead>`;
    const tbody = (0, Preact_js_1.html) `<tbody>
        ${(body.rows?.length ?? 0) !== 0
        ? body.rows.map((row) => (0, Preact_js_1.html) `<tr>
                          ${row === "more"
            ? (0, Preact_js_1.html) `<td class="pluto-tree-more-td" colspan=${maxcolspan}>${more(1)}</td>`
            : (0, Preact_js_1.html) `<th>${row[0]}</th>
                                    ${row[1].map((x) => (0, Preact_js_1.html) `<td><div>${x === "more" ? null : mimepair_output(x)}</div></td>`)}`}
                      </tr>`)
        : (0, Preact_js_1.html) `<${EmptyRows} colspan=${maxcolspan} />`}
    </tbody>`;
    return (0, Preact_js_1.html) `<table class="pluto-table" ref=${node_ref}>
        ${thead}${tbody}
    </table>`;
};
exports.TableView = TableView;
let DivElement = ({ cell_id, style, classname, children, persist_js_state = false, sanitize_html = true }) => {
    const mimepair_output = (pair) => (0, Preact_js_1.html) `<${exports.SimpleOutputBody} cell_id=${cell_id} mime=${pair[1]} body=${pair[0]} persist_js_state=${persist_js_state} sanitize_html=${sanitize_html} />`;
    return (0, Preact_js_1.html) `<div style=${style} class=${classname}>${children.map(mimepair_output)}</div>`;
};
exports.DivElement = DivElement;
