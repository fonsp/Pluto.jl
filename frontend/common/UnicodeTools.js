const te = new TextEncoder()
const td = new TextDecoder()

export const length_utf8 = (str, startindex_utf16 = 0, endindex_utf16 = undefined) => te.encode(str.substring(startindex_utf16, endindex_utf16)).length

export const utf8index_to_ut16index = (str, index_utf8) => td.decode(te.encode(str).slice(0, index_utf8)).length

export const splice_utf8 = (original, startindex_utf8, endindex_utf8, replacement) => {
    // JS uses UTF-16 for internal representation of strings, e.g.
    // "e".length == 1, "é".length == 1, "🐶".length == 2

    // Julia uses UTF-8, e.g.
    // ncodeunits("e") == 1, ncodeunits("é") == 2, ncodeunits("🐶") == 4
    //     length("e") == 1,     length("é") == 1,     length("🐶") == 1

    // Completion results from julia will give the 'splice indices': "where should the completed keyword be inserted?"
    // we need to splice into javascript string, so we convert to a UTF-8 byte array, then splice, then back to the string.

    const original_enc = te.encode(original)
    const replacement_enc = te.encode(replacement)

    const result_enc = new Uint8Array(original_enc.length + replacement_enc.length - (endindex_utf8 - startindex_utf8))

    result_enc.set(original_enc.slice(0, startindex_utf8), 0)
    result_enc.set(replacement_enc, startindex_utf8)
    result_enc.set(original_enc.slice(endindex_utf8), startindex_utf8 + replacement_enc.length)

    return td.decode(result_enc)
}

export const slice_utf8 = (original, startindex_utf8, endindex_utf8) => {
    // JS uses UTF-16 for internal representation of strings, e.g.
    // "e".length == 1, "é".length == 1, "🐶".length == 2

    // Julia uses UTF-8, e.g.
    // ncodeunits("e") == 1, ncodeunits("é") == 2, ncodeunits("🐶") == 4
    //     length("e") == 1,     length("é") == 1,     length("🐶") == 1

    const original_enc = te.encode(original)
    return td.decode(original_enc.slice(startindex_utf8, endindex_utf8))
}

console.assert(splice_utf8("e é 🐶 is a dog", 5, 9, "hannes ❤") === "e é hannes ❤ is a dog")
console.assert(slice_utf8("e é 🐶 is a dog", 5, 9) === "🐶")

// get this by running commit fd78c36f from https://github.com/fonsp/Pluto.jl/pull/3271
// and manually add greek characters, see https://en.wikipedia.org/wiki/Unicode_subscripts_and_superscripts
export const sub_charmap = {
    "0": "₀",
    "1": "₁",
    "2": "₂",
    "3": "₃",
    "4": "₄",
    "5": "₅",
    "6": "₆",
    "7": "₇",
    "8": "₈",
    "9": "₉",
    "x": "ₓ",
    "k": "ₖ",
    "j": "ⱼ",
    "v": "ᵥ",
    "o": "ₒ",
    "-": "₋",
    "s": "ₛ",
    "n": "ₙ",
    "=": "₌",
    "p": "ₚ",
    "i": "ᵢ",
    "u": "ᵤ",
    "r": "ᵣ",
    "a": "ₐ",
    "t": "ₜ",
    ")": "₎",
    "+": "₊",
    "h": "ₕ",
    "l": "ₗ",
    "e": "ₑ",
    "(": "₍",
    "m": "ₘ",
    // manually added greek characters
    "β": "ᵦ",
    "γ": "ᵧ",
    "ι": "ͺ",
    "ρ": "ᵨ",
    "φ": "ᵩ",
    "χ": "ᵪ",
}

// get this by running commit fd78c36f from https://github.com/fonsp/Pluto.jl/pull/3271
// and manually add greek characters, see https://en.wikipedia.org/wiki/Unicode_subscripts_and_superscripts
export const sup_charmap = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "l": "ˡ",
    "J": "ᴶ",
    "D": "ᴰ",
    ")": "⁾",
    "W": "ᵂ",
    "m": "ᵐ",
    "I": "ᴵ",
    "o": "ᵒ",
    "h": "ʰ",
    "e": "ᵉ",
    "G": "ᴳ",
    "x": "ˣ",
    "V": "ⱽ",
    "b": "ᵇ",
    "f": "ᶠ",
    "g": "ᵍ",
    "T": "ᵀ",
    "R": "ᴿ",
    "p": "ᵖ",
    "(": "⁽",
    "M": "ᴹ",
    "r": "ʳ",
    "B": "ᴮ",
    "k": "ᵏ",
    "P": "ᴾ",
    "=": "⁼",
    "H": "ᴴ",
    "L": "ᴸ",
    "w": "ʷ",
    "+": "⁺",
    "i": "ⁱ",
    "N": "ᴺ",
    "t": "ᵗ",
    "n": "ⁿ",
    "z": "ᶻ",
    "U": "ᵁ",
    "E": "ᴱ",
    "d": "ᵈ",
    "u": "ᵘ",
    "j": "ʲ",
    "a": "ᵃ",
    "v": "ᵛ",
    "A": "ᴬ",
    "y": "ʸ",
    "c": "ᶜ",
    "K": "ᴷ",
    "s": "ˢ",
    "O": "ᴼ",
    "-": "⁻",
    "!": "ꜝ",
    // manually added greek characters
    "α": "ᵅ",
    "β": "ᵝ",
    "γ": "ᵞ",
    "δ": "ᵟ",
    "ε": "ᵋ",
    "θ": "ᶿ",
}
