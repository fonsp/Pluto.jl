// @ts-ignore
export let is_mac_keyboard = /Mac/i.test(navigator.userAgentData?.platform ?? navigator.platform)

export let control_name = is_mac_keyboard ? "⌃" : "Ctrl"
export let ctrl_or_cmd_name = is_mac_keyboard ? "⌘" : "Ctrl"
export let alt_or_options_name = is_mac_keyboard ? "⌥" : "Alt"
export let and = is_mac_keyboard ? " " : "+"

export let has_ctrl_or_cmd_pressed = (event) => event.ctrlKey || (is_mac_keyboard && event.metaKey)

export let map_cmd_to_ctrl_on_mac = (keymap) => {
    if (!is_mac_keyboard) {
        return keymap
    }

    let keymap_with_cmd = { ...keymap }
    for (let [key, handler] of Object.entries(keymap)) {
        keymap_with_cmd[key.replace(/Ctrl/g, "Cmd")] = handler
        // remove Ctrl-D from Pluto.jl keybind for MacOS
        if (key == "Ctrl-D") {
            delete keymap_with_cmd[key]
        }
    }
    return keymap_with_cmd
}

export let in_textarea_or_input = () => {
    const in_footer = document.activeElement?.closest("footer") != null
    const in_header = document.activeElement?.closest("header") != null
    const in_cm = document.activeElement?.closest(".cm-editor") != null

    const { tagName } = document.activeElement ?? {}
    return tagName === "INPUT" || tagName === "TEXTAREA" || in_footer || in_header || in_cm
}
