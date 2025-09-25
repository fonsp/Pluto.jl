<script>
    import { onMount, createEventDispatcher } from "svelte"
    import { has_ctrl_or_cmd_pressed } from "../common/KeyboardShortcuts.js"
    import _ from "../imports/lodash.js"
    import "https://cdn.jsdelivr.net/gh/fonsp/rebel-tag-input@1.0.6/lib/rebel-tag-input.mjs"
    import immer from "../imports/immer.js"
    import FeaturedCard from "../components/welcome/FeaturedCard.svelte"
    import { t } from "../common/lang.js"
    import Input from './Input.svelte'

    export let filename
    export let remote_frontmatter
    export let set_remote_frontmatter

    let dialog_element
    let is_open = false

    let frontmatter = remote_frontmatter ?? {}

    $: frontmatter = remote_frontmatter ?? {}

    const set_frontmatter = (updater) => {
        frontmatter = updater(frontmatter)
    }

    const fm_setter = (key) => (value) =>
        set_frontmatter(
            immer((fm) => {
                _.set(fm, key, value)
            })
        )

    const open = () => {
        if (!is_open) {
            is_open = true
            requestAnimationFrame(() => {
                dialog_element?.scrollIntoView({ behavior: "instant", block: "nearest", inline: "nearest" })
            })
        }
    }

    const close = () => {
        is_open = false
    }

    const toggle = () => {
        is_open = !is_open
    }

    const cancel = () => {
        frontmatter = remote_frontmatter ?? {}
        close()
    }

    let set_remote_frontmatter_ref = set_remote_frontmatter

    $: set_remote_frontmatter_ref = set_remote_frontmatter

    const submit = () => {
        set_remote_frontmatter_ref(clean_data(frontmatter) ?? {}).then(() => alert(t("t_frontmatter_synchronized")))
        close()
    }

    const handleKeydown = (e) => {
        if (dialog_element != null && dialog_element.contains(e.target)) {
            if (e.key === "Enter" && has_ctrl_or_cmd_pressed(e)) {
                submit()
            }
        }
    }

    const handleOpenFrontmatter = () => {
        open()
    }

    onMount(() => {
        window.addEventListener("keydown", handleKeydown)
        window.addEventListener("open pluto frontmatter", handleOpenFrontmatter)
        
        return () => {
            window.removeEventListener("keydown", handleKeydown)
            window.removeEventListener("open pluto frontmatter", handleOpenFrontmatter)
        }
    })

    const frontmatter_with_defaults = {
        title: null,
        description: null,
        date: null,
        image: null,
        tags: [],
        author: [{}],
        language: null,
        ...frontmatter,
    }

    const show_entry = ([key, value]) => !((_.isArray(value) && field_type(key) !== "tags") || _.isPlainObject(value))

    const clean_data = (obj) => {
        let a = _.isPlainObject(obj)
            ? Object.fromEntries(
                  Object.entries(obj)
                      .map(([key, val]) => [key, clean_data(val)])
                      .filter(([key, val]) => val != null)
              )
            : _.isArray(obj)
            ? obj.map(clean_data).filter((x) => x != null)
            : obj

        return !_.isNumber(a) && _.isEmpty(a) ? null : a
    }

    const special_field_names = ["tags", "date", "license", "url", "color", "language"]

    const field_type = (name) => {
        if (name === "image") return "url"
        for (const t of special_field_names) {
            if (name === t || name.endsWith(`_${t}`)) {
                return t
            }
        }
        return "text"
    }

    const code_licenses = ["AGPL-3.0", "GPL-3.0", "LGPL-3.0", "MPL-2.0", "Apache-2.0", "MIT", "BSL-1.0", "Unlicense"]
    const creative_licenses = ["CC-BY-4.0", "CC-BY-SA-4.0", "CC-BY-NC-4.0", "CC-BY-NC-SA-4.0", "CC-BY-ND-4.0", "CC-BY-NC-ND-4.0", "CC0-1.0"]
    const licenses = [...code_licenses, ...creative_licenses]
</script>

<svelte:window on:open-pluto-frontmatter={handleOpenFrontmatter} />

{#if is_open}
    <dialog bind:this={dialog_element} class="pluto-frontmatter" open>
        <h1>{t("t_frontmatter_title")}</h1>
        <p>{t("t_frontmatter_description")}</p>
        <div class="card-preview" aria-hidden="true">
            <h2>{t("t_frontmatter_preview")}</h2>
            <FeaturedCard
                entry={{
                    id: filename.replace(/\.jl$/, ""),
                    hash: "xx",
                    frontmatter: clean_data(frontmatter) ?? {},
                }}
                source_manifest={{}}
                image_loading="lazy"
                disable_links={true}
            />
        </div>
        <div class="fm-table">
            {#each Object.entries(frontmatter_with_defaults).filter(show_entry) as [key, value]}
                {@const path = `${key}`}
                {@const id = `fm-${path}`}
                <label for={id}>{key}</label>
                <Input 
                    type={field_type(key)} 
                    {id} 
                    value={value} 
                    on_value={fm_setter(path)} 
                    on:delete_field={() => {
                        set_frontmatter(
                            immer((fm) => {
                                _.unset(fm, path)
                            })
                        )
                    }}
                />
            {/each}
            <button
                class="addentry"
                on:click={() => {
                    const fieldname = prompt("Field name:")
                    if (fieldname) {
                        set_frontmatter(
                            immer((fm) => {
                                _.set(fm, `${fieldname}`, null)
                            })
                        )
                    }
                }}
            >
                {t("t_frontmatter_add_field", { plus: "+" })}
            </button>
            
            {#if _.isArray(frontmatter_with_defaults.author)}
                {#each frontmatter_with_defaults.author as author, i}
                    {@const author_with_defaults = {
                        name: null,
                        url: null,
                        ...author,
                    }}
                    <fieldset class="fm-table">
                        <legend>Author {i + 1}</legend>
                        {#each Object.entries(author_with_defaults).filter(show_entry) as [key, value]}
                            {@const path = `author[${i}].${key}`}
                            {@const id = `fm-${path}`}
                            <label for={id}>{key}</label>
                            <Input 
                                type={field_type(key)} 
                                {id} 
                                value={value} 
                                on_value={fm_setter(path)} 
                                on:delete_field={() => {
                                    set_frontmatter(
                                        immer((fm) => {
                                            _.unset(fm, `author[${i}].${key}`)
                                        })
                                    )
                                }}
                            />
                        {/each}
                    </fieldset>
                {/each}
                <button
                    class="addentry"
                    on:click={() => {
                        set_frontmatter((fm) => ({ ...fm, author: [...(fm?.author ?? []), {}] }))
                    }}
                >
                    {t("t_frontmatter_add_author", { plus: "+" })}
                </button>
            {/if}
        </div>

        <div class="final">
            <button on:click={cancel}>{t("t_frontmatter_cancel")}</button>
            <button on:click={submit}>{t("t_frontmatter_save")}</button>
        </div>
    </dialog>
{/if}

<style>
    .pluto-frontmatter {
        padding: 2rem;
        border: 1px solid var(--border-color, #ccc);
        border-radius: 8px;
        background: var(--bg-color, white);
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
    }

    .card-preview {
        margin: 1rem 0;
        padding: 1rem;
        border: 1px solid var(--preview-border-color, #e0e0e0);
        border-radius: 4px;
        background: var(--preview-bg, #f8f8f8);
    }

    .fm-table {
        display: grid;
        grid-template-columns: 1fr 2fr auto;
        gap: 0.5rem;
        align-items: center;
        margin: 1rem 0;
    }

    .fm-table fieldset {
        grid-column: 1 / -1;
        border: 1px solid var(--fieldset-border, #ddd);
        padding: 1rem;
        margin: 0.5rem 0;
    }

    .fm-table label {
        font-weight: bold;
        text-align: right;
        padding-right: 0.5rem;
    }

    .fm-table input,
    .fm-table select {
        padding: 0.25rem;
        border: 1px solid var(--input-border, #ccc);
        border-radius: 4px;
    }

    .deletefield {
        background: var(--delete-bg, #ff4444);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        cursor: pointer;
    }

    .addentry {
        background: var(--add-bg, #4CAF50);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 0.5rem 1rem;
        cursor: pointer;
        grid-column: 1 / -1;
        justify-self: start;
    }

    .final {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 1rem;
    }

    .final button {
        padding: 0.5rem 1rem;
        border: 1px solid var(--button-border, #ccc);
        border-radius: 4px;
        background: var(--button-bg, #f0f0f0);
        cursor: pointer;
    }

    .final button:last-child {
        background: var(--save-bg, #2196F3);
        color: white;
    }
</style>