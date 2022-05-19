let path = require("path")
let fs = require("fs/promises")
let posthtml = require("posthtml")
let posthtmlSri = require("posthtml-sri")

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
        ]

        const result = await posthtml(plugins).process(contents)
        // console.log(result)

        // Write to file
        await fs.writeFile(file, result.html)
        console.log("✅ SRI added to ", file)
    }
}

f()
