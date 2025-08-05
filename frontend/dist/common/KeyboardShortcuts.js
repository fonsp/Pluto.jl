"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.in_textarea_or_input = exports.map_cmd_to_ctrl_on_mac = exports.has_ctrl_or_cmd_pressed = exports.and = exports.alt_or_options_name = exports.ctrl_or_cmd_name = exports.control_name = exports.is_mac_keyboard = void 0;
// @ts-ignore
exports.is_mac_keyboard = /Mac/i.test(navigator.userAgentData?.platform ?? navigator.platform);
exports.control_name = exports.is_mac_keyboard ? "⌃" : "Ctrl";
exports.ctrl_or_cmd_name = exports.is_mac_keyboard ? "⌘" : "Ctrl";
exports.alt_or_options_name = exports.is_mac_keyboard ? "⌥" : "Alt";
exports.and = exports.is_mac_keyboard ? " " : "+";
let has_ctrl_or_cmd_pressed = (event) => event.ctrlKey || (exports.is_mac_keyboard && event.metaKey);
exports.has_ctrl_or_cmd_pressed = has_ctrl_or_cmd_pressed;
let map_cmd_to_ctrl_on_mac = (keymap) => {
    if (!exports.is_mac_keyboard) {
        return keymap;
    }
    let keymap_with_cmd = { ...keymap };
    for (let [key, handler] of Object.entries(keymap)) {
        keymap_with_cmd[key.replace(/Ctrl/g, "Cmd")] = handler;
        // remove Ctrl-D from Pluto.jl keybind for MacOS
        if (key == "Ctrl-D") {
            delete keymap_with_cmd[key];
        }
    }
    return keymap_with_cmd;
};
exports.map_cmd_to_ctrl_on_mac = map_cmd_to_ctrl_on_mac;
let in_textarea_or_input = () => {
    const in_footer = document.activeElement?.closest("footer") != null;
    const in_header = document.activeElement?.closest("header") != null;
    const in_cm = document.activeElement?.closest(".cm-editor") != null;
    const { tagName } = document.activeElement ?? {};
    return tagName === "INPUT" || tagName === "TEXTAREA" || in_footer || in_header || in_cm;
};
exports.in_textarea_or_input = in_textarea_or_input;
