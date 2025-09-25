<script>
  import { onMount } from 'svelte'
  import _ from '../../imports/lodash.js'
  import FeaturedCard from './FeaturedCard.svelte'
  import { t, th } from '../../common/lang.js'

  export let sources = null
  export let direct_html_links = false

  // source_data will be a mapping from [source URL] => [data from that source]
  let source_data = {}
  let waited_too_long = false

  // This data is used as placeholder while the real data is loading from the network.
  const placeholder_data = [
    {
      title: "Featured Notebooks",
      description: "These notebooks from the Julia community show off what you can do with Pluto. Give it a try, you might learn something new!",
      collections: [
        {
          title: "Loading...",
          tags: [],
        },
      ],
      notebooks: {},
    },
  ]

  // This HTML is shown instead of the featured notebooks if the user is offline.
  const offline_html = `
    <div class="featured-source">
      <h1>${placeholder_data[0].title}</h1>
      <p>Here are a couple of notebooks to get started with Pluto.jl:</p>
      <ul>
        <li>1. <a href="sample/Getting%20started.jl">Getting started</a></li>
        <li>2. <a href="sample/Markdown.jl">Markdown</a></li>
        <li>3. <a href="sample/Basic%20mathematics.jl">Basic mathematics</a></li>
        <li>4. <a href="sample/Interactivity.jl">Interactivity</a></li>
        <li>5. <a href="sample/PlutoUI.jl.jl">PlutoUI.jl</a></li>
        <li>6. <a href="sample/Plots.jl.jl">Plots.jl</a></li>
        <li>7. <a href="sample/Tower%20of%20Hanoi.jl">Tower of Hanoi</a></li>
        <li>8. <a href="sample/JavaScript.jl">JavaScript</a></li>
      </ul>
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <p>Tip: <em>Visit this page again when you are connected to the internet to read our online collection of featured notebooks.</em></p>
    </div>
  `

  // If no collections are defined, then this special collection will just show all notebooks under the "Notebooks" category.
  const fallback_collections = [
    {
      title: "Notebooks",
      tags: "everything",
    },
  ]

  function get_id(source) {
    return source?.id ?? source.url
  }

  onMount(() => {
    if (sources != null) {
      waited_too_long = false
      source_data = {}

      const ids = Array.from(new Set(sources.map(get_id)))

      const promises = ids.map((id) => {
        const sources_for_id = sources.filter((source) => get_id(source) === id)

        let result = promise_any_with_priority(
          sources_for_id.map(async (source) => {
            const { url, integrity, valid_until } = source

            if (valid_until != null && new Date(valid_until) < new Date()) {
              throw new Error(`Source ${url} is expired with valid_until ${valid_until}`)
            }

            const data = await (await fetch(new Request(url, { integrity: integrity ?? undefined }))).json()

            if (data.format_version !== "1") {
              throw new Error(`Invalid format version: ${data.format_version}`)
            }

            return [data, id, url]
          })
        )

        return result.then(([data, id, url]) => {
          source_data = {
            ...source_data,
            [id]: {
              ...data,
              source_url: url,
            },
          }
        })
      })

      Promise.any(promises).catch((e) => {
        console.error("All featured sources failed to load: ", e)
        ;(e?.errors ?? []).forEach((e) => console.error(e))
        waited_too_long = true
      })
    }

    const timeout = setTimeout(() => {
      waited_too_long = true
    }, 8 * 1000)

    return () => clearTimeout(timeout)
  })

  $: if (Object.entries(source_data).length > 0) {
    console.log("Sources:", source_data)
  }

  $: no_data = Object.entries(source_data).length === 0
  $: ids = Array.from(new Set(sources?.map(get_id) ?? []))
  $: sorted_on_source_order = ids.map((id) => source_data[id]).filter((d) => d != null)

  function promise_any_with_priority(promises, already_rejected = []) {
    if (promises.length <= 1) {
      return Promise.any([...promises, ...already_rejected])
    } else {
      return promises[0].catch(() => promise_any_with_priority(promises.slice(1), [...already_rejected, promises[0]]))
    }
  }

  function collection(notebooks, tags) {
    const nbs = tags === "everything" ? notebooks : notebooks.filter((notebook) => tags.some((t) => (notebook.frontmatter?.tags ?? []).includes(t)))

    const n = (s) => (isNaN(s) ? s : Number(s))
    return _.sortBy(nbs, [(nb) => n(nb?.frontmatter?.order), "id"])
  }
</script>

{#if no_data && waited_too_long}
  {@html offline_html}
{:else}
  {#each (no_data ? placeholder_data : sorted_on_source_order) as data}
    {@const collections = data?.collections ?? fallback_collections}
    <div class="featured-source">
      <h1>{data.title}</h1>
      <p>{data.description}</p>
      {#each collections as coll}
        {@const collection_notebooks = collection(Object.values(data.notebooks), coll.tags ?? [])}
        <div class="collection">
          <h2>{coll.title}</h2>
          <p>{coll.description}</p>
          <div class="card-list">
            {#each collection_notebooks as entry}
              <FeaturedCard 
                {entry} 
                source_manifest={data} 
                {direct_html_links} 
                disable_links={false}
                image_loading="lazy"
              />
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/each}
{/if}