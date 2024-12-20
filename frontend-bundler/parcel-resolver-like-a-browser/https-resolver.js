 const { Resolver } = require("@parcel/plugin");
const path = require("path");
const fs = require("fs/promises");
const { mkdirp } = require("mkdirp");
const { URL } = require("url");
const crypto = require("crypto");

const DONT_INCLUDE = { isExcluded: true };
const MAX_RETRIES = 10;
const FETCH_TIMEOUT = 10000; // Timeout for fetching resources in milliseconds

// Utility to check if a file exists
const fileExists = async (filePath) => !!(await fs.stat(filePath).catch(() => false));

// Retry function with a maximum number of attempts
async function keepTrying(fn, maxRetries = MAX_RETRIES) {
    try {
        return await fn();
    } catch (e) {
        if (maxRetries === 0) {
            throw e;
        }
        return await keepTrying(fn, maxRetries - 1);
    }
}

// Main resolver logic
module.exports = new Resolver({
    async resolve({ specifier, dependency, options }) {
        const tempCacheDir = path.join(options.cacheDir, ".net");

        // Wait before resolving to handle any asynchronous setup if needed
        await new Promise((resolve) => setTimeout(resolve, FETCH_TIMEOUT));

        // Handle CommonJS specifiers
        if (dependency.specifierType === "commonjs") {
            if (specifier === "process") {
                return { filePath: "/dev/null.js", code: "" };
            }
            if (specifier.startsWith("@parcel") || dependency.sourcePath.includes("node_modules/@parcel")) {
                return null;
            }
            console.error(`Unrecognized CommonJS import:`, dependency);
            return DONT_INCLUDE;
        }

        // Exclude unsupported "sample" imports
        if (specifier.startsWith("sample")) {
            return DONT_INCLUDE;
        }

        // Convert custom directory structures into valid URLs
        if (dependency.sourcePath?.startsWith?.(tempCacheDir)) {
            const [protocol, hostname, ...urlPath] = dependency.sourcePath
                .slice(tempCacheDir.length)
                .slice(1)
                .split("/");
            const urlObject = new URL(specifier, `${protocol}://${hostname}/${urlPath.join("/")}`);
            specifier = urlObject.toString();
        }

        // Handle HTTP/HTTPS URLs
        if (specifier.startsWith("https://") || specifier.startsWith("http://")) {
            const url = new URL(specifier);

            // Validate URL
            if (url.port) throw new Error(`Port in URLs not supported yet (${specifier})`);
            if (url.hash) throw new Error(`Hash in URLs not supported yet (${specifier})`);
            if (url.username || url.password) throw new Error(`Authentication in URLs not supported (${specifier})`);

            // Guess or append file extension
            const extensionMatch = /\.[a-zA-Z][a-zA-Z0-9]+$/.exec(url.pathname)?.[0];
            const defaultExtension = dependency.specifierType === "esm" ? ".mjs" : "";
            const extension = extensionMatch || defaultExtension;

            const searchHash =
                url.search !== ""
                    ? "." + crypto.createHmac("sha256", "42").update(url.search).digest("hex").slice(0, 10)
                    : "";
            const filePathParts = (url.pathname.slice(1) + searchHash + extension).split("/");
            const resolvedPath = path.join(tempCacheDir, url.protocol.slice(0, -1), url.hostname, ...filePathParts);
            const directory = path.dirname(resolvedPath);

            // Fetch and cache the file if it doesn't already exist
            if (!(await fileExists(resolvedPath))) {
                await keepTrying(async () => {
                    const response = await fetch(specifier);
                    if (response.status !== 200) {
                        throw new Error(`${specifier} returned ${response.status}`);
                    }

                    const buffer = await response.arrayBuffer();
                    if (buffer.byteLength === 0) {
                        throw new Error(`${specifier} returned an empty response.`);
                    }

                    await mkdirp(directory);
                    await fs.writeFile(resolvedPath, Buffer.from(buffer));

                    // Verify written content
                    const writtenContent = await fs.readFile(resolvedPath);
                    if (writtenContent.length !== buffer.byteLength) {
                        throw new Error(`Failed to write file ${resolvedPath}`);
                    }
                });
            }

            return { filePath: resolvedPath };
        }

        // Handle ESM and URL specifiers
        if (dependency.specifierType === "esm" || dependency.specifierType === "url") {
            return {
                filePath: path.join(path.dirname(dependency.sourcePath ?? "/"), specifier),
            };
        }

        // Log unrecognized dependencies and exclude
        console.error(`Unrecognized dependency:`, {
            specifier: dependency.specifier,
            specifierType: dependency.specifierType,
            sourcePath: dependency.sourcePath,
        });
        return DONT_INCLUDE;
    },
});
