import i18next from "https://esm.sh/i18next"
import LanguageDetector from "https://esm.sh/i18next-browser-languagedetector"
import { html } from "../imports/Preact.js"

// @ts-ignore
import english from "./english.json" with { type: "json" }
// @ts-ignore
import nederlands from "./nederlands.json" with { type: "json" }

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
      order: ["navigator"],
      caches: false,
    },
    // lng: "nl",
  }); 
  
  

export const t = i18next.t

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
    const slot = (name) => `❊${name}⦿`
    const can_interpolate_directly = (value) => typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    
    const with_slots = t(key, {interpolation: { escapeValue: false }, ...Object.fromEntries(Object.entries(insertions ?? {}).map(([key, value]) => [key, can_interpolate_directly(value) ? value : slot(key)]))})
    
    const string_parts = with_slots.split(/❊.*?⦿/)
    // Disabled because i want HTML to be supported
    // if(string_parts.length === 1) return string_parts[0]
    return html(string_parts, ...Object.values(insertions ?? {}).filter(v => !can_interpolate_directly(v)))
}


// console.log(1, html`asdf <a>asdf</a>`)
// console.log(2, html([`asdf <a>asdf</a>`]))
