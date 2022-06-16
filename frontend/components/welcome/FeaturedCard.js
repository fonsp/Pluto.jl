import { base64url_to_base64 } from "../../common/PlutoHash.js"
import { with_query_params } from "../../common/URLTools.js"
import _ from "../../imports/lodash.js"
import { html, useEffect, useState, useMemo } from "../../imports/Preact.js"

const transparent_svg = "data:image/svg+xml;charset=utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E"

const str_to_degree = (s) => ([...s].reduce((a, b) => a + b.charCodeAt(0), 0) * 79) % 360

/**
 * @param {{
 *  entry: import("./Featured.js").SourceManifestNotebookEntry,
 *  source_url: String,
 * }} props
 */
export const FeaturedCard = ({ entry, source_url }) => {
    const title = entry.frontmatter?.title
    const u = (x) => (x == null ? null : new URL(x, source_url).href)

    const href = with_query_params(`editor.html`, {
        statefile: u(entry.statefile_path),
        notebookfile: u(entry.notebookfile_path),
        notebookfile_integrity: `sha256-${base64url_to_base64(entry.hash)}`,
        disable_ui: `true`,
        pluto_server_url: `.`,
        name: title == null ? null : `sample ${title}`,
    })

    const author = author_info(entry.frontmatter)

    return html`
        <featured-card style=${`--card-color-hue: ${str_to_degree(entry.id)}deg;`}>
            <a class="banner" href=${href}><img src=${u(entry.frontmatter.image) ?? transparent_svg} /></a>
            ${author?.name == null
                ? null
                : html`
                      <div class="author">
                          <a href=${author.url}> <img src=${author.image ?? transparent_svg} /><span>${author.name}</span></a>
                      </div>
                  `}
            <h3><a href=${href} title=${entry.frontmatter.title}>${entry.frontmatter.title}</a></h3>
            <p title=${entry.frontmatter.description}>${entry.frontmatter.description}</p>
        </featured-card>
    `
}

/**
 * @typedef AuthorInfo
 * @type {{
 * name: string?,
 * url: string?,
 * image: string?,
 * }}
 */

const author_info = (frontmatter) =>
    author_info_item(frontmatter.author) ??
    author_info_item({
        name: frontmatter.author_name,
        url: frontmatter.author_url,
        image: frontmatter.author_image,
    })

/**
 * @returns {AuthorInfo?}
 */
const author_info_item = (x) => {
    if (x instanceof Array) {
        return author_info_item(x[0])
    } else if (x == null) {
        return null
    } else if (typeof x === "string") {
        return {
            name: x,
            url: null,
            image: null,
        }
    } else if (x instanceof Object) {
        let { name, image, url } = x

        if (image == null && url != null) {
            image = url + ".png?size=48"
        }

        return {
            name,
            url,
            image,
        }
    } else {
        return null
    }
}
