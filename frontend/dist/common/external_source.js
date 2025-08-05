"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_included_external_source = void 0;
/**
 * Get a `<link rel="pluto-external-source">` element from editor.html.
 * @param {String} id
 * @returns {HTMLLinkElement?}
 */
const get_included_external_source = (id) => document.head.querySelector(`link[rel='pluto-external-source'][id='${id}']`);
exports.get_included_external_source = get_included_external_source;
