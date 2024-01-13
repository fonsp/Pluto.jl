export const open_pluto_popup = (/** @type{import("../components/Popup").PkgPopupDetails | import("../components/Popup").MiscPopupDetails} */ detail) => {
    window.dispatchEvent(
        new CustomEvent("open pluto popup", {
            detail,
        })
    )
}
