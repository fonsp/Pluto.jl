"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PkgTerminalView = void 0;
const AnsiUp_js_1 = require("../imports/AnsiUp.js");
const Preact_js_1 = require("../imports/Preact.js");
const make_spinner_spin = (original_html) => original_html.replaceAll("◐", `<span class="make-me-spin">◐</span>`);
const TerminalViewAnsiUp = ({ value }) => {
    const node_ref = (0, Preact_js_1.useRef)(/** @type {HTMLElement?} */ (null));
    const start_time = (0, Preact_js_1.useRef)(Date.now());
    (0, Preact_js_1.useEffect)(() => {
        if (!node_ref.current)
            return;
        node_ref.current.style.cssText = `--animation-delay: -${(Date.now() - start_time.current) % 1000}ms`;
        node_ref.current.innerHTML = make_spinner_spin((0, AnsiUp_js_1.ansi_to_html)(value));
        const parent = node_ref.current.parentElement;
        if (parent)
            parent.scrollTop = 1e5;
    }, [node_ref.current, value]);
    return !!value
        ? (0, Preact_js_1.html) `<pkg-terminal
              ><div class="scroller" tabindex="0"><pre ref=${node_ref} class="pkg-terminal"></pre></div
          ></pkg-terminal>`
        : null;
};
exports.PkgTerminalView = TerminalViewAnsiUp;
