"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const highlight_min_js_1 = __importDefault(require("https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/es/highlight.min.js"));
// @ts-ignore
const julia_min_js_1 = __importDefault(require("https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/es/languages/julia.min.js"));
// @ts-ignore
const julia_repl_min_js_1 = __importDefault(require("https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/es/languages/julia-repl.min.js"));
highlight_min_js_1.default.registerLanguage("julia", julia_min_js_1.default);
highlight_min_js_1.default.registerLanguage("julia-repl", julia_repl_min_js_1.default);
// Attach the highlighter object to the window to allow custom highlighting from the frontend. See https://github.com/fonsp/Pluto.jl/pull/2244
//@ts-ignore
window.hljs = highlight_min_js_1.default;
exports.default = highlight_min_js_1.default;
