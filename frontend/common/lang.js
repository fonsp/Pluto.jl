import i18next from "../imports/i18next.js"
import LanguageDetector from "../imports/i18next-browser-languagedetector.js"
import { html } from "../imports/Preact.js"
import _ from "../imports/lodash.js"

import { deutsch, ellinika, english, nederlands } from "./lang_imports.js"

const without_empty_keys = (obj) => {
    return Object.fromEntries(Object.entries(obj).filter(([_, value]) => value !== ""))
}

i18next.use(LanguageDetector).init({
    debug: false,
    fallbackLng: "en",
    resources: {
        de: {
            translation: without_empty_keys(deutsch),
        },
        el: {
            translation: ellinika,
        },
        en: {
            translation: without_empty_keys(english),
        },
        nl: {
            translation: without_empty_keys(nederlands),
        },
        nb: {
            translation: without_empty_keys(norsk_bokmaal),
        }
    },
    detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "i18nextLng",
    },
})

export const t = i18next.t

/**
 * Get available languages with their display names and translation completeness
 * @returns {Array<{code: string, name: string, completeness: number}>}
 */
export const getAvailableLanguages = () => {
    const languages = Object.keys(i18next.options.resources || {})
    const englishKeys = Object.keys(i18next.options.resources?.en?.translation || {})
    const totalKeys = englishKeys.length

    return languages.map((lang) => {
        const langKeys = Object.keys(i18next.options.resources?.[lang]?.translation || {})
        const completeness = totalKeys > 0 ? Math.round((langKeys.length / totalKeys) * 100) : 100

        return {
            code: lang,
            name: t(`t_language_name`, { lng: lang, fallbackLng: false, defaultValue: lang }),
            completeness: completeness,
        }
    })
}

/**
 * Change the current language
 * @param {string} language - Language code
 */
export const changeLanguage = async (language) => {
    await i18next.changeLanguage(language)
}

/**
 * Get current language
 * @returns {string}
 */
export const getCurrentLanguage = () => {
    return i18next.language
}

document.documentElement.lang = getCurrentLanguage()

/**
 * Like t, but you can interpolate Preact elements.
 * @param {string} key
 * @param {Record<string, any>=} insertions
 * @returns {string | import("../imports/Preact.js").ReactElement}
 */
export const th = (key, insertions) => {
    const slot = (name) => `❊${name}⦿`

    const can_interpolate_directly = (value) => typeof value === "string" || typeof value === "number" || typeof value === "boolean"

    const with_slots = t(key, {
        interpolation: { escapeValue: false },
        ...Object.fromEntries(Object.entries(insertions ?? {}).map(([key, value]) => [key, can_interpolate_directly(value) ? value : slot(key)])),
    })

    const slots = find_slots(with_slots)
    const slots_extended = [{ start: 0, end: 0, name: "" }, ...slots, { start: with_slots.length, end: with_slots.length, name: "" }]

    // The strings inbetween slots, including an initial and final string (possibly empty).
    const string_parts = slots_extended.slice(1).map((slot, i) => with_slots.slice(slots_extended[i].end, slot.start))

    // Objects to fill the slots with.
    const to_interpolate = slots.map((slot) => insertions?.[slot.name])

    const cache_key = [key, ...Object.keys(insertions ?? {})]
    return html(to_template_strings_array_cached(string_parts, cache_key), ...to_interpolate)
}

const find_slots = (/** @type {string} */ string) => {
    const matches = [...string.matchAll(/❊([^⦿]*?)⦿/g)]
    return matches.map((m) => ({
        start: m.index,
        end: m.index + m[0].length,
        name: m[1],
    }))
}

export const localized_list_htl = (elements, elements_strings, options) => {
    const keys = elements_strings.map((x) => x.toString())

    const list_format = new Intl.ListFormat(getCurrentLanguage(), options)
    const parts = list_format.formatToParts(keys)

    // Empty strings, everything is interpolated.
    const strings = Array(parts.length + 1).fill("")

    const interpolation_parts = parts.map((part) =>
        part.type === "element"
            ? // Find the matching element_string, and get the element with the same index.
              elements[keys.indexOf(part.value)]
            : // Literal string.
              part.value
    )

    return html(to_template_strings_array_cached(strings, parts.length), ...interpolation_parts)
}

/** @type {Map<string, TemplateStringsArray>} */
const template_strings_array_cache = new Map()
const to_template_strings_array_cached = (/** @type {string[]} */ strings, key) => {
    const key_string = JSON.stringify(key)
    const found = template_strings_array_cache.get(key_string)
    if (found) return found

    // @ts-ignore
    const result = /** @type {TemplateStringsArray} */ (strings)
    template_strings_array_cache.set(key_string, result) // @ts-ignore
    return result
}
