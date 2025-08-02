import * as preact from "../imports/Preact.js"
import { html } from "../imports/Preact.js"
import { getCurrentLanguage, getAvailableLanguages, changeLanguage, t } from "../lang/lang.js"

/**
 * Language picker component for the footer
 */
export const LanguagePicker = () => {
    const [currentLanguage, setCurrentLanguage] = preact.useState(getCurrentLanguage())
    const availableLanguages = getAvailableLanguages()

    const handleLanguageChange = async (event) => {
        const selectedLanguage = event.target.value
        setCurrentLanguage(selectedLanguage)
        await changeLanguage(selectedLanguage)

        // Offer to refresh the page to see the language change
        requestAnimationFrame(() => {
            if (confirm(t("t_refresh_to_see_language_change_confirm"))) {
                window.location.reload()
            }
        })
    }

    return html`
        <div class="language-picker">
            <!-- <label for="language-select">${t("t_language_picker_label")}:</label> -->
            <select id="language-select" value=${currentLanguage} onChange=${handleLanguageChange}>
                ${availableLanguages.map(
                    (lang) => html`<option value=${lang.code}>${lang.name}${lang.completeness < 100 ? ` (${lang.completeness}%)` : ""}</option>`
                )}
            </select>
        </div>
    `
}
