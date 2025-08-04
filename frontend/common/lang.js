import i18next from "../imports/i18next.js"
import LanguageDetector from "../imports/i18next-browser-languagedetector.js"
import { html } from "../imports/Preact.js"

// @ts-ignore
import english from "../lang/english.json" with { type: "json" }
// @ts-ignore
import nederlands from "../lang/nederlands.json" with { type: "json" }
import _ from "../imports/lodash.js"

console.log({english, nederlands})

const a = i18next
  .use(LanguageDetector)
  .init({
    debug: true,
    fallbackLng: "en",
    resources: {
      en: {
        translation: english,
      },
      nl: {
        translation: nederlands,
      },
    },
    // supportedLngs: ["en", "nl"],
    detection: {
      // Disabled autodetection for now because we don't have enough translations yet.
      // order: ["localStorage", "navigator"],
      order: ["localStorage"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
    // lng: "nl",
  }); 
  
  

export const t = i18next.t

/**
 * Get available languages with their display names and translation completeness
 * @returns {Array<{code: string, name: string, completeness: number}>}
 */
export const getAvailableLanguages = () => {
    const languages = Object.keys(i18next.options.resources || {})
    const englishKeys = Object.keys(i18next.options.resources?.en?.translation || {})
    const totalKeys = englishKeys.length
    
    return languages.map(lang => {
        const langKeys = Object.keys(i18next.options.resources?.[lang]?.translation || {})
        const completeness = totalKeys > 0 ? Math.round((langKeys.length / totalKeys) * 100) : 100
        
        return {
            code: lang,
            name: t(`t_language_name`, { lng: lang }),
            completeness: completeness
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

// export const th = (strings, ...values) => {
//     const strings_translated = strings.map(s => i18next.t(s, { interpolation: { escapeValue: false } }))
//     return html(strings_translated, ...values)
// }


/**
 * Like t, but you can interpolate Preact elements.
 * @param {string} key 
* @param {Record<string, any>=} insertions
 * @returns {string | import("../imports/Preact.js").ReactElement}
 */
export const th = (key, insertions) => {
    const slot_name = (name) => `❊${name}⦿`

    const slot = (name, value) => _.isArray(value) ? value.map((v,i) => slot_name(name + "__" + i)) : slot_name(name)
    
    
    
    const unslot = (value) => _.isArray(value) ? value : [value]
    const can_interpolate_directly = (value) => typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    
    const with_slots = t(key, {interpolation: { escapeValue: false }, ...Object.fromEntries(Object.entries(insertions ?? {}).map(([key, value]) => [key, can_interpolate_directly(value) ? value : slot(key, value)]))})
    
    const string_parts = with_slots.split(/❊.*?⦿/)
    // Disabled because i want HTML to be supported
    // if(string_parts.length === 1) return string_parts[0]
    
    // TODO uhhhh but the inserted objects need to be ordered!
    
    return html(to_template_strings_array(string_parts), ...Object.values(insertions ?? {}).filter(v => !can_interpolate_directly(v)).flatMap(unslot))
}


const to_template_strings_array = (/** @type {string[]} */ strings) => {
    // @ts-ignore
    return /** @type {TemplateStringsArray} */ (strings)
}
