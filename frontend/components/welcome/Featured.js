import _ from "../../imports/lodash.js"
import { html, useEffect, useState } from "../../imports/Preact.js"
import register from "../../imports/PreactCustomElement.js"
import { FeaturedCard } from "./FeaturedCard.js"

/**
 * @typedef SourceManifestNotebookEntry
 * @type {{
 *   id: String,
 *   hash: String,
 *   html_path?: String,
 *   statefile_path?: String,
 *   notebookfile_path?: String,
 *   frontmatter?: Record<string,any>,
 * }}
 */

/**
 * @typedef SourceManifestCollectionEntry
 * @type {{
 *   title?: String,
 *   description?: String,
 *   tags?: Array<String> | "everything",
 * }}
 */

/**
 * @typedef SourceManifest
 * @type {{
 *   notebooks: Record<string,SourceManifestNotebookEntry>,
 *   collections?: Array<SourceManifestCollectionEntry>,
 *   pluto_version?: String,
 *   julia_version?: String,
 *   format_version?: String,
 *   source_url?: String,
 *   title?: String,
 *   description?: String,
 * }}
 */

/** @type {SourceManifest[]} */
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

const offline_html = html`
    <div class="featured-source">
        <h1>${placeholder_data[0].title}</h1>
        <p>Here are a couple of notebooks to get started with Pluto.jl:</p>
        <ul>
            <li>1. <a href="sample/Getting%20started.jl">Getting started</a></li>
            <li>2. <a href="sample/Basic%20mathematics.jl">Basic mathematics</a></li>
            <li>3. <a href="sample/Interactivity.jl">Interactivity</a></li>
            <li>4. <a href="sample/PlutoUI.jl.jl">PlutoUI.jl</a></li>
            <li>5. <a href="sample/Plots.jl.jl">Plots.jl</a></li>
            <li>6. <a href="sample/Tower%20of%20Hanoi.jl">Tower of Hanoi</a></li>
            <li>7. <a href="sample/JavaScript.jl">JavaScript</a></li>
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

/**
 * @typedef FeaturedSource
 * @type {{url: String, integrity?: String}}
 */

/**
 * @param {{
 * sources: FeaturedSource[]?
 * }} props
 */
export const Featured = ({ sources }) => {
    const [source_data, set_source_data] = useState(/** @type{Record<String,SourceManifest>} */ ({}))

    useEffect(() => {
        if (sources != null) {
            const promises = sources.map(async ({ url, integrity }) => {
                const data = await (await fetch(new Request(url, { integrity: integrity ?? undefined }))).json()

                if (data.format_version !== "1") {
                    throw new Error(`Invalid format version: ${data.format_version}`)
                }

                set_source_data((old) => ({
                    ...old,
                    [url]: {
                        ...data,
                        source_url: url,
                    },
                }))
            })

            Promise.any(promises).catch((e) => {
                console.error("All featured sources failed to load: ", e)
                set_waited_too_long(true)
            })
        }
    }, [sources])

    useEffect(() => {
        if (Object.entries(source_data).length > 0) {
            console.log("Sources:", source_data)
        }
    }, [source_data])

    const [waited_too_long, set_waited_too_long] = useState(false)
    useEffect(() => {
        setTimeout(() => {
            set_waited_too_long(true)
        }, 8 * 1000)
    }, [])

    const no_data = Object.entries(source_data).length === 0

    return no_data && waited_too_long
        ? offline_html
        : html`
              ${(no_data ? placeholder_data : Object.values(source_data)).map((/** @type {SourceManifest} */ data) => {
                  let collections = data?.collections ?? [
                      {
                          title: "Notebooks",
                          tags: "everything",
                      },
                  ]
                  return html`
                      <div class="featured-source">
                          <h1>${data.title}</h1>
                          <p>${data.description}</p>
                          ${collections.map((coll) => {
                              return html`
                                  <div class="collection">
                                      <h2>${coll.title}</h2>
                                      <p>${coll.description}</p>
                                      <div class="card-list">
                                          ${collection(Object.values(data.notebooks), coll.tags ?? []).map(
                                              (entry) => html`<${FeaturedCard} entry=${entry} source_url=${data.source_url} />`
                                          )}
                                      </div>
                                  </div>
                              `
                          })}
                      </div>
                  `
              })}
          `
}

register(Featured, "pluto-featured", ["sources"])

const collection = (/** @type {SourceManifestNotebookEntry[]} */ notebooks, /** @type {String[] | "everything"} */ tags) => {
    const nbs = tags === "everything" ? notebooks : notebooks.filter((notebook) => tags.some((t) => (notebook.frontmatter?.tags ?? []).includes(t)))

    let n = (s) => (isNaN(s) ? s : Number(s))
    return /** @type {SourceManifestNotebookEntry[]} */ (_.sortBy(nbs, [(nb) => n(nb?.frontmatter?.order), "id"]))
}
