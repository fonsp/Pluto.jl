"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ansi_to_html = void 0;
// @ts-ignore
const _esm_1 = __importDefault(require("https://cdn.jsdelivr.net/npm/ansi_up@5.1.0/+esm"));
// needs .default a second time, weird
const AnsiUp = _esm_1.default.default;
const ansi_to_html = (ansi, { use_classes = true } = {}) => {
    const ansi_up = new AnsiUp();
    ansi_up.use_classes = use_classes;
    return ansi_up.ansi_to_html(ansi);
};
exports.ansi_to_html = ansi_to_html;
