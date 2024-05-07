/**
 * Get a `<link rel="pluto-external-source">` element from editor.html.
 * @param {String} id
 * @returns {HTMLLinkElement?}
 */
export const get_included_external_source = (id) => document.head.querySelector(`link[rel='pluto-external-source'][id='${id}']`)
