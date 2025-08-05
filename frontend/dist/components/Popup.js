"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Popup = exports.open_icon = exports.help_circle_icon = exports.document_text_icon = exports.arrow_up_circle_icon = void 0;
const Preact_js_1 = require("../imports/Preact.js");
const ClassTable_js_1 = require("../common/ClassTable.js");
const PlutoContext_js_1 = require("../common/PlutoContext.js");
const PkgStatusMark_js_1 = require("./PkgStatusMark.js");
const PkgTerminalView_js_1 = require("./PkgTerminalView.js");
const RunArea_js_1 = require("./RunArea.js");
const InstallTimeEstimate_js_1 = require("../common/InstallTimeEstimate.js");
const EditOrRunButton_js_1 = require("./EditOrRunButton.js");
const useEventListener_js_1 = require("../common/useEventListener.js");
const external_source_js_1 = require("../common/external_source.js");
exports.arrow_up_circle_icon = (0, external_source_js_1.get_included_external_source)("arrow_up_circle_icon")?.href;
exports.document_text_icon = (0, external_source_js_1.get_included_external_source)("document_text_icon")?.href;
exports.help_circle_icon = (0, external_source_js_1.get_included_external_source)("help_circle_icon")?.href;
exports.open_icon = (0, external_source_js_1.get_included_external_source)("open_icon")?.href;
/**
 * @typedef PkgPopupDetails
 * @property {"nbpkg"} type
 * @property {HTMLElement} [source_element]
 * @property {Boolean} [big]
 * @property {string} [css_class]
 * @property {Boolean} [should_focus] Should the popup receive keyboard focus after opening? Rule of thumb: yes if the popup opens on a click, no if it opens spontaneously.
 * @property {string} package_name
 * @property {boolean} is_disable_pkg
 */
/**
 * @typedef MiscPopupDetails
 * @property {"info" | "warn"} type
 * @property {import("../imports/Preact.js").ReactElement} body
 * @property {HTMLElement?} [source_element]
 * @property {string} [css_class]
 * @property {Boolean} [big]
 * @property {Boolean} [should_focus] Should the popup receive keyboard focus after opening? Rule of thumb: yes if the popup opens on a click, no if it opens spontaneously.
 */
const Popup = ({ notebook, disable_input }) => {
    const [recent_event, set_recent_event] = (0, Preact_js_1.useState)(/** @type{(PkgPopupDetails | MiscPopupDetails)?} */ (null));
    const recent_event_ref = (0, Preact_js_1.useRef)(/** @type{(PkgPopupDetails | MiscPopupDetails)?} */ (null));
    recent_event_ref.current = recent_event;
    const recent_source_element_ref = (0, Preact_js_1.useRef)(/** @type{HTMLElement?} */ (null));
    const pos_ref = (0, Preact_js_1.useRef)("");
    const open = (0, Preact_js_1.useCallback)((/** @type {CustomEvent} */ e) => {
        const el = e.detail.source_element;
        recent_source_element_ref.current = el;
        if (el == null) {
            pos_ref.current = `top: 20%; left: 50%; transform: translate(-50%, -50%); position: fixed;`;
        }
        else {
            const elb = el.getBoundingClientRect();
            const bodyb = document.body.getBoundingClientRect();
            pos_ref.current = `top: ${0.5 * (elb.top + elb.bottom) - bodyb.top}px; left: min(max(0px,100vw - 251px - 30px), ${elb.right - bodyb.left}px);`;
        }
        set_recent_event(e.detail);
    }, [set_recent_event]);
    const close = (0, Preact_js_1.useCallback)(() => {
        set_recent_event(null);
    }, [set_recent_event]);
    (0, useEventListener_js_1.useEventListener)(window, "open pluto popup", open, [open]);
    (0, useEventListener_js_1.useEventListener)(window, "close pluto popup", close, [close]);
    (0, useEventListener_js_1.useEventListener)(window, "pointerdown", (e) => {
        if (recent_event_ref.current == null)
            return;
        if (e.target == null)
            return;
        if (e.target.closest("pluto-popup") != null)
            return;
        if (recent_source_element_ref.current != null && recent_source_element_ref.current.contains(e.target))
            return;
        close();
    }, [close]);
    (0, useEventListener_js_1.useEventListener)(window, "keydown", (e) => {
        if (e.key === "Escape")
            close();
    }, [close]);
    // focus the popup when it opens
    const element_focused_before_popup = (0, Preact_js_1.useRef)(/** @type {any} */ (null));
    (0, Preact_js_1.useLayoutEffect)(() => {
        if (recent_event != null) {
            if (recent_event.should_focus === true) {
                requestAnimationFrame(() => {
                    element_focused_before_popup.current = document.activeElement;
                    /** @type {HTMLElement?} */
                    const el = element_ref.current?.querySelector("a, input, button") ?? element_ref.current;
                    // console.debug("restoring focus to", el)
                    el?.focus?.();
                });
            }
            else {
                element_focused_before_popup.current = null;
            }
        }
    }, [recent_event != null]);
    const element_ref = (0, Preact_js_1.useRef)(/** @type {HTMLElement?} */ (null));
    // if the popup was focused on opening:
    // when the popup loses focus (and the focus did not move to the source element):
    // 1. close the popup
    // 2. return focus to the element that was focused before the popup opened
    (0, useEventListener_js_1.useEventListener)(element_ref.current, "focusout", (e) => {
        if (recent_event_ref.current != null && recent_event_ref.current.should_focus === true) {
            if (element_ref.current?.matches(":focus-within"))
                return;
            if (element_ref.current?.contains(e.relatedTarget))
                return;
            if (recent_source_element_ref.current != null &&
                (recent_source_element_ref.current.contains(e.relatedTarget) || recent_source_element_ref.current.matches(":focus-within")))
                return;
            close();
            e.preventDefault();
            element_focused_before_popup.current?.focus?.();
        }
    }, [close]);
    const type = recent_event?.type;
    return (0, Preact_js_1.html) `<pluto-popup
            class=${(0, ClassTable_js_1.cl)({
        visible: recent_event != null,
        [type ?? ""]: type != null,
        big: recent_event?.big === true,
        [recent_event?.css_class ?? ""]: recent_event?.css_class != null,
    })}
            style="${pos_ref.current}"
            ref=${element_ref}
            tabindex=${"0" /* this makes the popup itself focusable (not just its buttons), just like a <dialog> element. It also makes the `.matches(":focus-within")` trick work. */}
        >
            ${type === "nbpkg"
        ? (0, Preact_js_1.html) `<${PkgPopup}
                      notebook=${notebook}
                      disable_input=${disable_input}
                      recent_event=${recent_event}
                      clear_recent_event=${() => set_recent_event(null)}
                  />`
        : type === "info" || type === "warn"
            ? (0, Preact_js_1.html) `<div>${recent_event?.body}</div>`
            : null}
        </pluto-popup>
        <div tabindex="0">
            <!-- We need this dummy tabindexable element here so that the element_focused_before_popup mechanism works on static exports. When tabbing out of the popup, focus would otherwise leave the page altogether because it's the last focusable element in DOM. -->
        </div>`;
};
exports.Popup = Popup;
/**
 * @param {{
 * notebook: import("./Editor.js").NotebookData,
 * recent_event: PkgPopupDetails,
 * clear_recent_event: () => void,
 * disable_input: boolean,
 * }} props
 */
const PkgPopup = ({ notebook, recent_event, clear_recent_event, disable_input }) => {
    let pluto_actions = (0, Preact_js_1.useContext)(PlutoContext_js_1.PlutoActionsContext);
    const [pkg_status, set_pkg_status] = (0, Preact_js_1.useState)(/** @type{import("./PkgStatusMark.js").PackageStatus?} */ (null));
    (0, Preact_js_1.useEffect)(() => {
        let still_valid = true;
        if (recent_event == null) {
            set_pkg_status(null);
        }
        else if (recent_event?.type === "nbpkg") {
            ;
            (pluto_actions.get_avaible_versions({ package_name: recent_event.package_name, notebook_id: notebook.notebook_id }) ?? Promise.resolve([])).then(({ versions, url }) => {
                if (still_valid) {
                    set_pkg_status((0, PkgStatusMark_js_1.package_status)({
                        nbpkg: notebook.nbpkg,
                        package_name: recent_event.package_name,
                        is_disable_pkg: recent_event.is_disable_pkg,
                        available_versions: versions,
                        package_url: url,
                    }));
                }
            });
        }
        return () => {
            still_valid = false;
        };
    }, [recent_event, ...(0, PkgStatusMark_js_1.nbpkg_fingerprint_without_terminal)(notebook.nbpkg)]);
    // hide popup when nbpkg is switched on/off
    const valid = recent_event.is_disable_pkg || (notebook.nbpkg?.enabled ?? true);
    (0, Preact_js_1.useEffect)(() => {
        if (!valid) {
            clear_recent_event();
        }
    }, [valid]);
    const [showterminal, set_showterminal] = (0, Preact_js_1.useState)(false);
    const needs_first_instatiation = notebook.nbpkg?.restart_required_msg == null && !(notebook.nbpkg?.instantiated ?? true);
    const busy = recent_event != null && ((notebook.nbpkg?.busy_packages ?? []).includes(recent_event.package_name) || needs_first_instatiation);
    const debounced_busy = (0, RunArea_js_1.useDebouncedTruth)(busy, 2);
    (0, Preact_js_1.useEffect)(() => {
        set_showterminal(debounced_busy);
    }, [debounced_busy]);
    const terminal_value = notebook.nbpkg?.terminal_outputs == null ? "Loading..." : notebook.nbpkg?.terminal_outputs[recent_event?.package_name] ?? "";
    const showupdate = pkg_status?.offer_update ?? false;
    const timingdata = (0, InstallTimeEstimate_js_1.usePackageTimingData)();
    const estimate = timingdata == null || recent_event?.package_name == null ? null : (0, InstallTimeEstimate_js_1.time_estimate)(timingdata, [recent_event?.package_name]);
    const total_time = estimate == null ? 0 : estimate.install + estimate.load + estimate.precompile;
    const total_second_time = estimate == null ? 0 : estimate.load;
    // <header>${recent_event?.package_name}</header>
    return (0, Preact_js_1.html) `<pkg-popup
        class=${(0, ClassTable_js_1.cl)({
        busy,
        showterminal,
        showupdate,
    })}
    >
        ${pkg_status?.hint ?? "Loading..."}
        ${(pkg_status?.status === "will_be_installed" || pkg_status?.status === "busy") && total_time > 10
        ? (0, Preact_js_1.html) `<div class="pkg-time-estimate">
                  Installation can take <strong>${(0, EditOrRunButton_js_1.pretty_long_time)(total_time)}</strong>${`. `}<br />${`Afterwards, it loads in `}
                  <strong>${(0, EditOrRunButton_js_1.pretty_long_time)(total_second_time)}</strong>.
              </div>`
        : null}
        <div class="pkg-buttons">
            ${recent_event?.is_disable_pkg || disable_input || notebook.nbpkg?.waiting_for_permission
        ? null
        : (0, Preact_js_1.html) `<a
                      class="pkg-update"
                      target="_blank"
                      title="Update packages"
                      style=${!!showupdate ? "" : "opacity: .4;"}
                      href="#"
                      onClick=${(e) => {
            if (busy) {
                alert("Pkg is currently busy with other packages... come back later!");
            }
            else {
                if (confirm("Would you like to check for updates and install them? A backup of the notebook file will be created.")) {
                    console.warn("Pkg.updating!");
                    pluto_actions.send("pkg_update", {}, { notebook_id: notebook.notebook_id });
                }
            }
            e.preventDefault();
        }}
                      ><img alt="⬆️" src=${exports.arrow_up_circle_icon} width="17"
                  /></a>`}
            <a
                class="toggle-terminal"
                target="_blank"
                title="Show/hide Pkg terminal output"
                style=${!!terminal_value ? "" : "display: none;"}
                href="#"
                onClick=${(e) => {
        set_showterminal(!showterminal);
        e.preventDefault();
    }}
                ><img alt="📄" src=${exports.document_text_icon} width="17"
            /></a>
            <a class="help" target="_blank" title="Go to help page" href="https://plutojl.org/pkg/"><img alt="❔" src=${exports.help_circle_icon} width="17" /></a>
        </div>
        <${PkgTerminalView_js_1.PkgTerminalView} value=${terminal_value ?? "Loading..."} />
    </pkg-popup>`;
};
