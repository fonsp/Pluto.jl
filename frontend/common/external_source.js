export const get_included_external_source = (id) => {
    const el = document.head.querySelector(`link[rel='pluto-external-source'][id='${id}']`)
    if (!el) return {}
    return {
        href: el.getAttribute("href"),
        integrity: el.getAttribute("integrity"),
    }
}
