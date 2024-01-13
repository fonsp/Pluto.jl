// should strip characters similar to how github converts filenames into the #file-... URL hash.
// test on: https://gist.github.com/fonsp/f7d230da4f067a11ad18de15bff80470
const gist_normalizer = (str) =>
    str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[^a-z1-9]/g, "")

export const guess_notebook_location = async (path_or_url) => {
    try {
        const u = new URL(path_or_url)
        if (!["http:", "https:", "ftp:", "ftps:"].includes(u.protocol)) {
            throw "Not a web URL"
        }
        if (u.host === "gist.github.com") {
            console.log("Gist URL detected")
            const parts = u.pathname.substring(1).split("/")
            const gist_id = parts[1]
            const gist = await (
                await fetch(`https://api.github.com/gists/${gist_id}`, {
                    headers: { Accept: "application/vnd.github.v3+json" },
                }).then((r) => (r.ok ? r : Promise.reject(r)))
            ).json()
            console.log(gist)
            const files = Object.values(gist.files)

            const selected = files.find((f) => gist_normalizer("#file-" + f.filename) === gist_normalizer(u.hash))
            if (selected != null) {
                return {
                    type: "url",
                    path_or_url: selected.raw_url,
                }
            }

            return {
                type: "url",
                path_or_url: files[0].raw_url,
            }
        } else if (u.host === "github.com") {
            u.searchParams.set("raw", "true")
        }
        return {
            type: "url",
            path_or_url: u.href,
        }
    } catch (ex) {
        /* Remove eventual single/double quotes from the path if they surround it, see
          https://github.com/fonsp/Pluto.jl/issues/1639 */
        if (path_or_url[path_or_url.length - 1] === '"' && path_or_url[0] === '"') {
            path_or_url = path_or_url.slice(1, -1) /* Remove first and last character */
        }
        return {
            type: "path",
            path_or_url: path_or_url,
        }
    }
}
