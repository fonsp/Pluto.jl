 const path = require("path");
const fs = require("fs/promises");
const posthtml = require("posthtml");
const posthtmlSri = require("posthtml-sri");
const posthtmlCrossorigin = require("@plutojl/posthtml-crossorigin");

// Main function to process HTML files
const processHtmlFiles = async () => {
    // Check if arguments are provided
    if (process.argv.length < 3) {
        console.error("❌ Please provide at least one HTML file as an argument.");
        process.exit(1);
    }

    for (let i = 2; i < process.argv.length; i++) {
        const file = process.argv[i];

        try {
            console.log(`🔄 Processing: ${file}`);
            // Read the HTML file
            const contents = await fs.readFile(file, "utf8");

            // Configure plugins for SRI and crossorigin attributes
            const plugins = [
                posthtmlSri({
                    algorithms: ["sha384"], // Recommended SRI algorithm
                    basePath: path.dirname(file),
                }),
                posthtmlCrossorigin({
                    value: () => "anonymous", // Set crossorigin="anonymous"
                }),
            ];

            // Process the file using PostHTML and plugins
            const result = await posthtml(plugins).process(contents);

            // Write the modified HTML back to the file
            await fs.writeFile(file, result.html, "utf8");
            console.log(`✅ SRI and crossorigin added to: ${file}`);
        } catch (error) {
            console.error(`❌ Error processing ${file}:`, error.message);
        }
    }
};

// Execute the function
processHtmlFiles();
