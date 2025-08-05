export const arrow_up_circle_icon: string;
export const document_text_icon: string;
export const help_circle_icon: string;
export const open_icon: string;
export function Popup({ notebook, disable_input }: {
    notebook: any;
    disable_input: any;
}): import("../imports/Preact.js").ReactElement;
export type PkgPopupDetails = {
    type: "nbpkg";
    source_element?: HTMLElement;
    big?: boolean;
    css_class?: string;
    /**
     * Should the popup receive keyboard focus after opening? Rule of thumb: yes if the popup opens on a click, no if it opens spontaneously.
     */
    should_focus?: boolean;
    package_name: string;
    is_disable_pkg: boolean;
};
export type MiscPopupDetails = {
    type: "info" | "warn";
    body: import("../imports/Preact.js").ReactElement;
    source_element?: HTMLElement | null;
    css_class?: string;
    big?: boolean;
    /**
     * Should the popup receive keyboard focus after opening? Rule of thumb: yes if the popup opens on a click, no if it opens spontaneously.
     */
    should_focus?: boolean;
};
