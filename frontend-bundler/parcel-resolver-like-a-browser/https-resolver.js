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
            if (dependency.sourcePath?.startsWith?.(path.join(os.tmpdir(), BROWSER_LIKE_PREFIX))) {
                let [without_extension, extension] = split_extension(dependency.sourcePath)
                let base64_url = without_extension.slice(BROWSER_LIKE_PREFIX.length)

                let url = new URL(btoa(base64_url))
                url.pathname = path.join(url.pathname, specifier)
                let fullurl = url.toString()

                specifier = fullurl
            }

            // console.log(`dependency.sourcePath:`, dependency.sourcePath)
            // await new Promise((resolve) => setTimeout(resolve, 10000))

            // if (dependency.sourcePath?.startsWith?.("/https")) {
            //     specifier = "https://" + path.join(path.dirname(dependency.sourcePath), specifier).slice("/https:/".length)
            //     // console.log(`specifier:`, specifier)
            //     // await new Promise((resolve) => setTimeout(resolve, 2000))
            // }

            // if (dependency.sourcePath?.startsWith?.("/http")) {
            //     specifier = "http://" + path.join(path.dirname(dependency.sourcePath), specifier).slice("/http:/".length)
            //     // console.log(`specifier:`, specifier)
            //     // await new Promise((resolve) => setTimeout(resolve, 2000))
            // }
        }

        if (specifier.startsWith("sample")) {
            return {
                code: "",
                filePath: "/" + specifier,
            }
        }

        if (specifier.startsWith("https://") || specifier.startsWith("http://")) {
            let response = await fetch(specifier)
            // let body = await response.text()
            let buffer = await response.buffer()

            let url = new URL(specifier)
            let [filename, extensions] = split_extension(url.pathname)
            let tmpdir = os.tmpdir()
            let fullpath = path.join(tmpdir, BROWSER_LIKE_PREFIX + atob(specifier) + "." + extensions)

            await fs.writeFile(fullpath, buffer)

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
            // console.log("WHUUUUT", specifier)
            // console.log(`dependency:`, {
            //     specifier: dependency.specifier,
            //     specifierType: dependency.specifierType,
            //     sourcePath: dependency.sourcePath,
            // })

            // await new Promise((resolve) => setTimeout(resolve, 10000))

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
