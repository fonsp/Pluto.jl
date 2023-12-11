// @ts-ignore
const AnsiUp =
    window?.AnsiUp ??
    class {
        ansi_to_html(value) {
            throw new Error("Method not implemented.")
            return ""
        }
    }

// @ts-ignore
export default AnsiUp
// export default window.AnsiUp
