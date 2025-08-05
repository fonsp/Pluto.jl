import i18next from "../imports/i18next.js"
import LanguageDetector from "../imports/i18next-browser-languagedetector.js"
import { html } from "../imports/Preact.js"
import _ from "../imports/lodash.js"


// These imports require quite modern browsers (https://caniuse.com/mdn-javascript_statements_import_import_attributes) but it will be bundled so it doesn't matter for Pluto releases.
// @ts-ignore
import english from "../lang/english.json" with { type: "json" }
// @ts-ignore
import nederlands from "../lang/nederlands.json" with { type: "json" }


const without_empty_keys = (obj) => {
    return Object.fromEntries(Object.entries(obj).filter(([_, value]) => value !== ""))
}

i18next
  .use(LanguageDetector)
  .init({
    debug: true,
    fallbackLng: "en",
    resources: {
      en: {
        translation: without_empty_keys(english),
      },
      nl: {
        translation: without_empty_keys(nederlands),
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


/**
 * Like t, but you can interpolate Preact elements.
 * @param {string} key 
* @param {Record<string, any>=} insertions
 * @returns {string | import("../imports/Preact.js").ReactElement}
 */
export const th = (key, insertions) => {
    const slot = (name) => `❊${name}⦿`

    
    
    
    const can_interpolate_directly = (value) => typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    
    const with_slots = t(key, {interpolation: { escapeValue: false }, ...Object.fromEntries(Object.entries(insertions ?? {}).map(([key, value]) => [key, can_interpolate_directly(value) ? value : slot(key)]))})
    
    
    
    const slots = find_slots(with_slots)
    const slots_extended = [{start: 0, end: 0, name: ""}, ...slots, {start: with_slots.length, end: with_slots.length, name: ""}]
    
    // The strings inbetween slots, including an initial and final string (possibly empty).
    const string_parts = slots_extended.slice(1).map((slot, i) => with_slots.slice(slots_extended[i].end, slot.start))

    // Objects to fill the slots with.
    const to_interpolate = slots.map(slot => insertions?.[slot.name])
    
    const cache_key = [key, ...Object.keys(insertions ?? {})]
    return html(to_template_strings_array_cached(string_parts, cache_key), ...to_interpolate)
}




const find_slots = (/** @type {string} */ string) => {
    const matches = [...string.matchAll(/❊([^⦿]*?)⦿/g)]
    return matches.map(m => ({
      start: m.index,
      end: m.index + m[0].length,
      name: m[1]
    }))
}


/** @type {Map<string, TemplateStringsArray>} */
const template_strings_array_cache = new Map()
const to_template_strings_array_cached = (/** @type {string[]} */ strings, key) => {
  const key_string = JSON.stringify(key)
  const found = template_strings_array_cache.get(key_string)
  if(found) return found
  
    // @ts-ignore
  const result = /** @type {TemplateStringsArray} */ (strings)
  template_strings_array_cache.set(key_string, result) // @ts-ignore
  return result
}
