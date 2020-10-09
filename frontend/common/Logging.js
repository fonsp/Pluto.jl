const log_functions = {
    Info: console.info,
    Error: console.error,
    Warn: console.warn,
    Debug: console.debug,
}

export const handle_log = ({ level, msg, file, line, kwargs }, filename) => {
    try {
        const f = log_functions[level] || console.log
        const args = [`%c┌ ${level}:\n`, `font-weight: bold`, msg]
        if (Object.keys(kwargs).length !== 0) {
            args.push(kwargs)
        }
        if (file.startsWith(filename)) {
            const cell_id = file.substring(file.indexOf("#==#") + 4)
            const cell_node = document.getElementById(cell_id)

            args.push(`\n\nfrom`, cell_node)
        }
        f(...args)
    } catch (err) {} // TODO
}
