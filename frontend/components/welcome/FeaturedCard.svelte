<script>
  import { base64url_to_base64 } from "../../common/PlutoHash.js"
  import { with_query_params } from "../../common/URLTools.js"

  export let entry
  export let source_manifest
  export let direct_html_links = false
  export let disable_links = false
  /** @type {"lazy" | "eager" | undefined} */
  export let image_loading

  // Helper function to check if string is empty (using lodash from original)
  function isEmpty(str) {
    return str == null || str === ''
  }

  // URL helper function from original JS
  function u(x) {
    const { source_url } = source_manifest ?? {}
    if (source_url == null) {
      return isEmpty(x) ? null : x
    } else {
      if (x == null) {
        return null
      } else {
        // URLs are relative to the source URL...
        try {
          return new URL(x, new URL(source_url, window.location.href)).href
        } catch (e) {
          console.error("Error creating URL:", e)
          return x
        }
      }
    }
  }

  // Generate href based on props
  $: href = disable_links
    ? "#"
    : direct_html_links
    ? u(entry?.html_path)
    : with_query_params(`edit`, {
        statefile: u(entry?.statefile_path),
        notebookfile: u(entry?.notebookfile_path),
        notebookfile_integrity: entry?.hash == null ? null : `sha256-${base64url_to_base64(entry.hash)}`,
        disable_ui: `true`,
        name: entry?.frontmatter?.title == null ? null : `sample ${entry.frontmatter.title}`,
        pluto_server_url: `.`,
        // Little monkey patch because we don't want to use the slider server when for the CDN source, only for the featured.plutojl.org source. But both sources have the same pluto_export.json so this is easiest.
        slider_server_url: source_manifest?.source_url?.includes("cdn.jsdelivr.net/gh/JuliaPluto/featured") 
          ? null 
          : u(source_manifest?.slider_server_url),
      })

  // Author info functions
  function author_info_item(x) {
    if (Array.isArray(x)) {
      const first = author_info_item(x[0])
      if (first?.name) {
        const has_coauthors = x.length > 1
        return { ...first, has_coauthors }
      }
    } else if (typeof x === "string") {
      return {
        name: x,
        url: null,
        image: null,
      }
    } else if (x instanceof Object) {
      let { name, image, url } = x

      if (image == null && !isEmpty(url)) {
        image = url + ".png?size=48"
      }

      return {
        name,
        url,
        image,
      }
    }
    return null
  }

  function author_info(frontmatter) {
    return author_info_item(frontmatter?.author) ??
      author_info_item({
        name: frontmatter?.author_name,
        url: frontmatter?.author_url,
        image: frontmatter?.author_image,
      })
  }

  // Get author info
  $: author = author_info(entry?.frontmatter)

  // Transparent SVG as fallback
  const transparent_svg = "data:image/svg+xml;charset=utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E"

  // Color generation based on ID (from original)
  function str_to_degree(s) {
    if (!s) return 0
    return ([...s].reduce((a, b) => a + b.charCodeAt(0), 0) * 79) % 360
  }

  // Get title (from original logic)
  $: title = entry?.frontmatter?.title

  $: card_color_hue = str_to_degree(entry?.id)
</script>

<featured-card style="--card-color-hue: {card_color_hue}deg;">
  <a class="banner" href={href}>
    <img 
      src={u(entry?.frontmatter?.image) ?? transparent_svg} 
      loading={image_loading}
      alt={title ?? "Featured notebook"}
    />
  </a>
  {#if author?.name != null}
    <div class="author">
      <img src={author.image ?? transparent_svg} loading={image_loading} alt={author.name} />
      <span>
        <a href={author.url}>{author.name}</a>
        {#if author.has_coauthors}
          and others
        {/if}
      </span>
    </div>
  {/if}
  <h3>
    <a 
      href={href} 
      title={title}
    >{title ?? entry?.id ?? "Untitled"}</a>
  </h3>
  <p title={entry?.frontmatter?.description}>{entry?.frontmatter?.description ?? ""}</p>
</featured-card>

<style>
  featured-card {
    --card-color: hsl(var(--card-color-hue), 77%, 82%);
    --card-border-radius: 10px;
    --card-border-width: 3px;

    display: block;
    border: var(--card-border-width) solid var(--card-color);
    border-radius: var(--card-border-radius);
    margin: 10px;
    padding-bottom: 0.3rem;
    box-shadow: 0px 2px 6px 0px #00000014;
    font-family: var(--inter-ui-font-stack);
    position: relative;
    word-break: break-word;
    hyphens: auto;
    background: white;
    max-width: 15rem;
  }

  featured-card a.banner {
    display: block;
  }

  featured-card a.banner img {
    width: 100%;
    aspect-ratio: 3/2;
    object-fit: cover;
    background: var(--card-color);
  }

  featured-card .author {
    display: flex;
    align-items: center;
    gap: 0.5em;
    padding: 0.5em;
  }

  featured-card .author img {
    width: 1.5em;
    height: 1.5em;
    border-radius: 50%;
    object-fit: cover;
  }

  featured-card .author a {
    font-weight: bold;
    text-decoration: underline;
  }

  featured-card h3 {
    margin: 0;
    padding: 0.5em;
  }

  featured-card h3 a {
    text-decoration: none;
    color: inherit;
    font-weight: bold;
  }

  featured-card p {
    margin: 0 0.8rem;
    color: #666;
    padding-bottom: 0.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
  }
</style>