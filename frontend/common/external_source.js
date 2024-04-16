export const get_included_external_source = (id) =>
    document.head.querySelector(`link[rel='plutoexternal-source'][id='${id}']`)?.getAttribute("href") ?? undefined
