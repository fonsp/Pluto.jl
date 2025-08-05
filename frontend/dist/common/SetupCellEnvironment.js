"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.require = exports.html = exports.svg = exports.now = exports.Promises = exports.Generators = exports.Files = exports.DOM = exports.default = exports.observablehq_for_cells = exports.make_library = void 0;
// @ts-ignore
const _esm_1 = require("https://cdn.jsdelivr.net/npm/@observablehq/stdlib@3.3.1/+esm");
const make_library = () => {
    // @ts-ignore
    const library = new _esm_1.Library();
    return {
        DOM: library.DOM,
        Files: library.Files,
        Generators: library.Generators,
        Promises: library.Promises,
        now: library.now,
        svg: library.svg(),
        html: library.html(),
        require: library.require(),
    };
    // TODO
    // observablehq.md and observablehq.tex will call d3-require, which will create a conflict if something else is using d3-require
    // in particular, plotly.js will break
    // observablehq.md(observablehq.require()).then((md) => (observablehq_exports.md = md))
    // observablehq.tex().then(tex => observablehq_exports.tex = tex)
};
exports.make_library = make_library;
// We use two different observable stdlib instances: one for ourselves and one for the JS code in cell outputs
const observablehq_for_myself = (0, exports.make_library)();
exports.default = observablehq_for_myself;
exports.observablehq_for_cells = (0, exports.make_library)();
exports.DOM = observablehq_for_myself.DOM;
exports.Files = observablehq_for_myself.Files;
exports.Generators = observablehq_for_myself.Generators;
exports.Promises = observablehq_for_myself.Promises;
exports.now = observablehq_for_myself.now;
exports.svg = observablehq_for_myself.svg;
exports.html = observablehq_for_myself.html;
exports.require = observablehq_for_myself.require;
