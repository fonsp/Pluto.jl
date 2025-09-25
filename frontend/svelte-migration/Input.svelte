<script>
    import { onMount, createEventDispatcher } from "svelte"
    import { t } from "../common/lang.js"

    export let value
    export let on_value
    export let type = "text"
    export let id

    const dispatch = createEventDispatcher()

    let input_element
    let input_value = value

    $: input_value = value

    onMount(() => {
        if (input_element) {
            input_element.value = value
        }
    })

    $: if (input_element) {
        input_element.value = value
    }

    const handleInput = (e) => {
        on_value(e.target.value)
    }

    const placeholder = type === "url" ? "https://..." : type === "language" ? t("t_frontmatter_language_placeholder") : undefined

    const pattern =
        type === "language"
            ? // https://stackoverflow.com/a/60899733
              "^((?<grandfathered>(en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE)|(art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang))|((?<language>([A-Za-z]{2,3}(-(?<extlang>[A-Za-z]{3}(-[A-Za-z]{3}){0,2}))?)|[A-Za-z]{4}|[A-Za-z]{5,8})(-(?<script>[A-Za-z]{4}))?(-(?<region>[A-Za-z]{2}|[0-9]{3}))?(-(?<variant>[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*(-(?<extension>[0-9A-WY-Za-wy-z](-[A-Za-z0-9]{2,8})+))*(-(?<privateUse>x(-[A-Za-z0-9]{1,8})+))?)|(?<privateUse1>x(-[A-Za-z0-9]{1,8})+))$"
            : undefined

    const code_licenses = ["AGPL-3.0", "GPL-3.0", "LGPL-3.0", "MPL-2.0", "Apache-2.0", "MIT", "BSL-1.0", "Unlicense"]
    const creative_licenses = ["CC-BY-4.0", "CC-BY-SA-4.0", "CC-BY-NC-4.0", "CC-BY-NC-SA-4.0", "CC-BY-ND-4.0", "CC-BY-NC-ND-4.0", "CC0-1.0"]
    const licenses = [...code_licenses, ...creative_licenses]

    const handleDeleteField = () => {
        dispatch('delete_field')
    }
</script>

{#if type === "tags"}
    <rbl-tag-input {id} bind:this={input_element} on:input={handleInput} />
{:else if type === "license"}
    <input bind:this={input_element} {id} type="text" list="oss-licenses" bind:value={input_value} on:input={handleInput} />
    <datalist id="oss-licenses">
        {#each licenses as name}
            <option>{name}</option>
        {/each}
    </datalist>
{:else}
    <input bind:this={input_element} dir="auto" type={type} {id} bind:value={input_value} on:input={handleInput} {placeholder} pattern={pattern} title={placeholder} />
{/if}

<button
    class="deletefield"
    title={t("t_frontmatter_delete_field")}
    aria-label={t("t_frontmatter_delete_field")}
    on:click={handleDeleteField}
>
    ✕
</button>