const log_functions = {
    Info: console.info,
    Error: console.error,
    Warn: console.warn,
    Debug: console.debug,
}

export const handle_log = ({ level, msg, file, line, kwargs }, filename) => {
    const f = log_functions[level] || console.log
    const args = [`%c┌ ${level}:\n`, `font-weight: bold`, msg]
    if (Object.keys(kwargs).length !== 0) {
        args.push(kwargs)
    }

    if (file.startsWith(filename)) {
        const cell_id = file.substring(file.indexOf("#==#") + 4)
        const cell_node = document.getElementById(cell_id)

        // hacky hackkkkkk
        const cm_internal_node = cell_node.querySelector(".CodeMirror-code")
        const origin_line = cm_internal_node.children[line - 1]

        args.push(`\n\nfrom`)
        if (origin_line == null) {
            args.push(cell_node)
        } else {
            args.push(origin_line)
        }
    }
    f(...args)
}
