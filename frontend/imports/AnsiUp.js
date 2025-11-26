// @ts-ignore
import AnsiUpPackage from "https://cdn.jsdelivr.net/npm/ansi_up@5.1.0/+esm"
// needs .default a second time, weird
const AnsiUp = AnsiUpPackage.default

export const ansi_to_html = (ansi, { use_classes = true } = {}) => {
    const ansi_up = new AnsiUp()
    ansi_up.use_classes = use_classes
    return ansi_up.ansi_to_html(ansi)
}
