import _ from "../../imports/lodash.js"
import { html, Component, useEffect, useState, useMemo } from "../../imports/Preact.js"
import { FeaturedCard } from "./FeaturedCard.js"

const run = (f) => f()

/**
 * @typedef SourceManifestNotebookEntry
 * @type {{
 *   id: String,
 *   hash: String,
 *   html_path: String,
 *   statefile_path: String,
 *   notebookfile_path: String,
 *   frontmatter: Record<string,any>,
 * }}
 */

/**
 * @typedef SourceManifestCollectionEntry
 * @type {{
 *   title: String?,
 *   description: String?,
 *   tags: Array<String>?,
 * }}
 */

/**
 * @typedef SourceManifest
 * @type {{
 *   notebooks: Record<string,SourceManifestNotebookEntry>,
 *   collections: Array<SourceManifestCollectionEntry>?,
 *   pluto_version: String,
 *   julia_version: String,
 *   format_version: String,
 *   source_url: String,
 *   title: String?,
 *   description: String?,
 * }}
 */

export const Featured = () => {
    const [sources, set_sources] = useState(/** @type{Array<{url: String, integrity: String?}>} */ (null))

    const [source_data, set_source_data] = useState(/** @type{Array<SourceManifest>} */ ([]))

    useEffect(() => {
        run(async () => {
            const data = await (await fetch("featured_sources.json")).json()

            set_sources(data.sources)
        })
    }, [])

    useEffect(() => {
        if (sources != null) {
            const promises = sources.map(async ({ url, integrity }) => {
                const data = await (await fetch(new Request(url, { integrity }))).json()

                if (data.format_version !== "1") {
                    throw new Error(`Invalid format version: ${data.format_version}`)
                }

                set_source_data((old) => [
                    ...old,
                    {
                        ...data,
                        source_url: url,
                    },
                ])
            })
        }
    }, [sources])

    useEffect(() => {
        if (source_data.length > 0) {
            console.log("Sources:", source_data)
        }
    }, [source_data])

    return html`
        ${source_data != null
            ? source_data.map(
                  (data) => html`
                      <div class="featured-source">
                          <h1>${data.title}</h1>
                          <p>${data.description}</p>
                          ${data.collections.map((coll) => {
                              return html`
                                  <div class="collection">
                                      <h2>${coll.title}</h2>
                                      <p>${coll.description}</p>
                                      <div class="card-list">
                                          ${collection(Object.values(data.notebooks), coll.tags).map(
                                              (entry) => html`<${FeaturedCard} entry=${entry} source_url=${data.source_url} />`
                                          )}
                                      </div>
                                  </div>
                              `
                          })}
                      </div>
                  `
              )
            : null}
    `
}

const collection = (/** @type {SourceManifestNotebookEntry[]} */ notebooks, /** @type {String[]} */ tags) => {
    const nbs = notebooks.filter((notebook) => tags.some((t) => (notebook.frontmatter?.tags ?? []).includes(t)))

    return /** @type {SourceManifestNotebookEntry[]} */ (_.sortBy(nbs, [(nb) => Number(nb?.frontmatter?.order), "id"]))
}
