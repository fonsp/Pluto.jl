"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.open_pluto_popup = void 0;
const open_pluto_popup = (/** @type{import("../components/Popup").PkgPopupDetails | import("../components/Popup").MiscPopupDetails} */ detail) => {
    window.dispatchEvent(new CustomEvent("open pluto popup", {
        detail,
    }));
};
exports.open_pluto_popup = open_pluto_popup;
