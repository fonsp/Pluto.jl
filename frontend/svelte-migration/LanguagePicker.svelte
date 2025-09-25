<script>
    import { onMount } from 'svelte';
    import { getCurrentLanguage, getAvailableLanguages, changeLanguage, t } from '../common/lang.js';
    
    let currentLanguage = getCurrentLanguage();
    const availableLanguages = getAvailableLanguages();
    
    async function handleLanguageChange(event) {
        const selectedLanguage = event.target.value;
        
        if (selectedLanguage === "contribute") {
            window.open("https://github.com/fonsp/Pluto.jl/tree/main/frontend/lang", "_blank");
            return;
        }
        
        currentLanguage = selectedLanguage;
        await changeLanguage(selectedLanguage);
        
        // Offer to refresh the page to see the language change
        requestAnimationFrame(() => {
            if (confirm(t("t_refresh_to_see_language_change_confirm"))) {
                window.location.reload();
            }
        });
    }
</script>

<div class="language-picker">
    <select
        id="language-select"
        aria-label={t("t_language_picker_description")}
        title={t("t_language_picker_description")}
        value={currentLanguage}
        on:change={handleLanguageChange}
    >
        {#each availableLanguages as lang}
            <option value={lang.code}>
                {lang.name}{lang.completeness < 98 ? ` (${lang.completeness}%)` : ""}
            </option>
        {/each}
        <option value="contribute">💡 Help translate!</option>
    </select>
</div>