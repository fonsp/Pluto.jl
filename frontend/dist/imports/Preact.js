"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hydrate = exports.cloneElement = exports.h = exports.useContext = exports.createRef = exports.createContext = exports.useErrorBoundary = exports.useCallback = exports.useMemo = exports.useRef = exports.useState = exports.useLayoutEffect = exports.useEffect = exports.Component = exports.render = exports.html = void 0;
// @ts-nocheck
const preact_10_13_2_pin_v113_target_es2020_1 = require("https://esm.sh/preact@10.13.2?pin=v113&target=es2020");
Object.defineProperty(exports, "render", { enumerable: true, get: function () { return preact_10_13_2_pin_v113_target_es2020_1.render; } });
Object.defineProperty(exports, "Component", { enumerable: true, get: function () { return preact_10_13_2_pin_v113_target_es2020_1.Component; } });
Object.defineProperty(exports, "h", { enumerable: true, get: function () { return preact_10_13_2_pin_v113_target_es2020_1.h; } });
Object.defineProperty(exports, "cloneElement", { enumerable: true, get: function () { return preact_10_13_2_pin_v113_target_es2020_1.cloneElement; } });
Object.defineProperty(exports, "createContext", { enumerable: true, get: function () { return preact_10_13_2_pin_v113_target_es2020_1.createContext; } });
Object.defineProperty(exports, "createRef", { enumerable: true, get: function () { return preact_10_13_2_pin_v113_target_es2020_1.createRef; } });
Object.defineProperty(exports, "hydrate", { enumerable: true, get: function () { return preact_10_13_2_pin_v113_target_es2020_1.hydrate; } });
const hooks_pin_v113_target_es2020_1 = require("https://esm.sh/preact@10.13.2/hooks?pin=v113&target=es2020");
Object.defineProperty(exports, "useEffect", { enumerable: true, get: function () { return 
    //
    hooks_pin_v113_target_es2020_1.useEffect; } });
Object.defineProperty(exports, "useLayoutEffect", { enumerable: true, get: function () { return hooks_pin_v113_target_es2020_1.useLayoutEffect; } });
Object.defineProperty(exports, "useState", { enumerable: true, get: function () { return hooks_pin_v113_target_es2020_1.useState; } });
Object.defineProperty(exports, "useRef", { enumerable: true, get: function () { return hooks_pin_v113_target_es2020_1.useRef; } });
Object.defineProperty(exports, "useMemo", { enumerable: true, get: function () { return hooks_pin_v113_target_es2020_1.useMemo; } });
Object.defineProperty(exports, "useCallback", { enumerable: true, get: function () { return hooks_pin_v113_target_es2020_1.useCallback; } });
Object.defineProperty(exports, "useContext", { enumerable: true, get: function () { return hooks_pin_v113_target_es2020_1.useContext; } });
Object.defineProperty(exports, "useErrorBoundary", { enumerable: true, get: function () { return hooks_pin_v113_target_es2020_1.useErrorBoundary; } });
const htm_3_1_1_pin_v113_target_es2020_1 = __importDefault(require("https://esm.sh/htm@3.1.1?pin=v113&target=es2020"));
const html = htm_3_1_1_pin_v113_target_es2020_1.default.bind(preact_10_13_2_pin_v113_target_es2020_1.h);
exports.html = html;
