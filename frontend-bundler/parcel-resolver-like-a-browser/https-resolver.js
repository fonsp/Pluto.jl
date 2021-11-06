let { Resolver } = require("@parcel/plugin")
let path = require("path")
let fetch = require("node-fetch")
let os = require("os")
let fs = require("fs/promises")

let { default: NodeResolver } = require("@parcel/node-resolver-core")

let atob = (text) => Buffer.from(text).toString("base64")
let btoa = (binary) => Buffer.from(binary, "base64").toString()

let split_extension = (_path) => {
    let filename = path.basename(_path)
    let [without_extension, ...extensions] = filename.split(".")
    return [without_extension, extensions.join(".")]
}

let BROWSER_LIKE_PREFIX = "like-browser-"

module.exports = new Resolver({
    async resolve({ specifier, dependency, options }) {
        if (specifier.startsWith(".")) {
            let path_prefix = path.join(os.tmpdir(), BROWSER_LIKE_PREFIX)
            if (dependency.sourcePath?.startsWith?.(path_prefix)) {
                let folder_things = dependency.sourcePath.slice(path_prefix.length).split("/")
                let base64_url = folder_things[0]

                let url = new URL(btoa(base64_url))
                url.pathname = path.join(path.dirname(url.pathname), specifier)
                let fullurl = url.toString()

                specifier = fullurl
            }
        }

        if (specifier.startsWith("sample")) {
            return { isExcluded: true }
        }

        if (specifier.startsWith("https://") || specifier.startsWith("http://")) {
            // if (specifier.endsWith(".woff") || specifier.endsWith(".woff2")) {
            //     return null
            // }

            let response = await fetch(specifier)

            if (response.status !== 200) {
                throw new Error(`${specifier} returned ${response.status}`)
            }

            // let body = await response.text()
            let buffer = await response.buffer()

            let url = new URL(specifier)
            let [filename, extensions] = split_extension(url.pathname)
            let tmpdir = os.tmpdir()
            let folder = path.join(tmpdir, BROWSER_LIKE_PREFIX + atob(specifier))
            try {
                await fs.mkdir(folder)
            } catch (error) {}
            let fullpath = path.join(folder, filename + "." + extensions)

            try {
                await fs.writeFile(fullpath, buffer)
            } catch (error) {}

            return {
                filePath: fullpath,
            }
        }

        if (specifier.startsWith("/")) {
            return {
                filePath: specifier,
            }
        }

        if (specifier.startsWith("@parcel") || dependency.specifierType === "commonjs") {
            const resolver = new NodeResolver({
                fs: options.inputFS,
                projectRoot: options.projectRoot,
                // Extensions are always required in URL dependencies.
                extensions: dependency.specifierType === "commonjs" || dependency.specifierType === "esm" ? ["ts", "tsx", "js", "jsx", "json"] : [],
                mainFields: ["source", "browser", "module", "main"],
            })

            return resolver.resolve({
                filename: specifier,
                specifierType: dependency.specifierType,
                parent: dependency.resolveFrom,
                env: dependency.env,
                sourcePath: dependency.sourcePath,
            })
        }

        if (specifier.startsWith(".") || dependency.specifierType === "url") {
            return {
                filePath: path.join(path.dirname(dependency.sourcePath), specifier),
            }
        }

        console.log("WHAAAAAT", specifier)
        console.log(`dependency:`, {
            specifier: dependency.specifier,
            specifierType: dependency.specifierType,
            sourcePath: dependency.sourcePath,
        })

        await new Promise((resolve) => setTimeout(resolve, 10000))

        // Let the next resolver in the pipeline handle
        // this dependency.
        return null
    },
})
