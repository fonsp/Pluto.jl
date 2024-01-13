// Go through all the CSS/JS imports in an HTML file, and add SRI attributes. More info here:
// https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity#examples

// I really really tried to do this using a parcel plugin but it's "not possible". So right now this is just a separate script that you run with the html filenames as arguments.

let path = require("path")
let fs = require("fs/promises")
let posthtml = require("posthtml")
let posthtmlSri = require("posthtml-sri")
let posthtmlCrossorigin = require("@plutojl/posthtml-crossorigin")

let f = async () => {
    // Read file given as command line arugment
    for (let i = 2; i < process.argv.length; i++) {
        let file = process.argv[i]
        let contents = await fs.readFile(file, "utf8")

        const plugins = [
            posthtmlSri({
                algorithms: ["sha384"],
                basePath: path.dirname(file),
            }),
            posthtmlCrossorigin({
                value: () => "anonymous",
            }),
        ]

        const result = await posthtml(plugins).process(contents)
        // console.log(result)

        // Write to file
        await fs.writeFile(file, result.html)
        console.log("✅ SRI added to ", file)
    }
}

f()
