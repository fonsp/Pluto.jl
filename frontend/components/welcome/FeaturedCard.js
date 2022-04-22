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
        disable_ui: true,
        pluto_server_url: `.`,
        name: title == null ? null : `sample ${title}`,
    })

    const author = author_info(entry.frontmatter.author)

    const [img_src, set_img_src] = useState(transparent_svg)

    useEffect(() => {
        if (entry.frontmatter.image != null) {
            const url = u(entry.frontmatter.image)
            fetch(url, { mode: "no-cors" })
                .then((r) => r.blob())
                .then((blob) => {
                    console.log(blob)
                    set_img_src(URL.createObjectURL(blob))
                })
            // .catch(() => {})
        }
    }, [entry.frontmatter.image])

    return html`
        <featured-card style=${`--card-color: hsl(${str_to_degree(entry.id)}deg 77% 82%);`}>
            <a class="banner" href=${href}><img src=${img_src} /></a>
            <div class="pretitle">
                ${author?.name == null
                    ? null
                    : html`
                          <span class="author"
                              ><a href=${author.url}> <img src=${author.image ?? transparent_svg} />${author.name} </a>
                          </span>
                      `}
            </div>
            <h3><a href=${href} title=${entry.frontmatter.title}>${entry.frontmatter.title}</a></h3>
            <p title=${entry.frontmatter.description}>${entry.frontmatter.description}</p>
        </featured-card>
    `
}

const author_info = (x) => {
    if (x instanceof Array) {
        return author_info(x[0])
    } else if (x == null) {
        return null
    } else if (x instanceof String) {
        return {
            name: x,
            profile_url: null,
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
    }
}
