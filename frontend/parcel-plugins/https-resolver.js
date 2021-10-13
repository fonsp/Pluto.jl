let { Resolver } = require("@parcel/plugin")
let path = require("path")
let fetch = require("node-fetch")

let { default: NodeResolver } = require("@parcel/node-resolver-core")

module.exports = new Resolver({
    async resolve({ specifier, dependency, options }) {
        if (specifier.startsWith(".")) {
            if (dependency.sourcePath?.startsWith?.("/https")) {
                specifier = "https://" + path.join(path.dirname(dependency.sourcePath), specifier).slice("/https:/".length)
                // console.log(`specifier:`, specifier)
                // await new Promise((resolve) => setTimeout(resolve, 2000))
            }

            if (dependency.sourcePath?.startsWith?.("/http")) {
                specifier = "http://" + path.join(path.dirname(dependency.sourcePath), specifier).slice("/http:/".length)
                // console.log(`specifier:`, specifier)
                // await new Promise((resolve) => setTimeout(resolve, 2000))
            }
        }

        if (specifier.startsWith("sample")) {
            return {
                code: "",
                filePath: "/" + specifier,
            }
        }

        if (specifier.startsWith("https://") || specifier.startsWith("http://")) {
            let response = await fetch(specifier)
            let body = await response.text()
            return {
                code: body,
                filePath: "/" + specifier,
            }
        }

        if (specifier.startsWith("/")) {
            return {
                filePath: specifier,
            }
        }

        if (specifier.startsWith("@") || dependency.specifierType === "commonjs") {
            console.log("WHUUUUT", specifier)
            console.log(`dependency:`, {
                specifier: dependency.specifier,
                specifierType: dependency.specifierType,
                sourcePath: dependency.sourcePath,
            })

            await new Promise((resolve) => setTimeout(resolve, 10000))

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
