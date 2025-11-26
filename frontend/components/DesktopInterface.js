export const open_from_path = () => {
    window.plutoDesktop?.fileSystem.openNotebook("path")
}
export const open_from_url = (/** @type string */ url) => {
    window.plutoDesktop?.fileSystem.openNotebook("url", url)
}

export const is_desktop = () => !!window.plutoDesktop
