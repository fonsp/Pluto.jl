"use strict";
/**
 * @fileoverview Main entry point for the Pluto Notebook API package
 *
 * This package provides a TypeScript/JavaScript API for programmatically
 * interacting with Pluto notebooks without requiring the full Editor UI.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MTOML_CELL_ID = exports.PTOML_CELL_ID = exports.DEFAULT_CELL_METADATA = exports.serializeNotebook = exports.parseNotebook = exports.PlutoNotebook = exports.Pluto = void 0;
// Export main API classes from PlutoNotebookAPI.js
var PlutoNotebookAPI_js_1 = require("./PlutoNotebookAPI.js");
Object.defineProperty(exports, "Pluto", { enumerable: true, get: function () { return PlutoNotebookAPI_js_1.Pluto; } });
Object.defineProperty(exports, "PlutoNotebook", { enumerable: true, get: function () { return PlutoNotebookAPI_js_1.PlutoNotebook; } });
// Export notebook parser functions
var NotebookParser_js_1 = require("./NotebookParser.js");
Object.defineProperty(exports, "parseNotebook", { enumerable: true, get: function () { return __importDefault(NotebookParser_js_1).default; } });
Object.defineProperty(exports, "serializeNotebook", { enumerable: true, get: function () { return NotebookParser_js_1.serializeNotebook; } });
// Export utility constants
var NotebookParser_js_2 = require("./NotebookParser.js");
Object.defineProperty(exports, "DEFAULT_CELL_METADATA", { enumerable: true, get: function () { return NotebookParser_js_2.DEFAULT_CELL_METADATA; } });
Object.defineProperty(exports, "PTOML_CELL_ID", { enumerable: true, get: function () { return NotebookParser_js_2.PTOML_CELL_ID; } });
Object.defineProperty(exports, "MTOML_CELL_ID", { enumerable: true, get: function () { return NotebookParser_js_2.MTOML_CELL_ID; } });
