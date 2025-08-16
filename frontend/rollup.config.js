import typescript from "@rollup/plugin-typescript"
import resolve from "@rollup/plugin-node-resolve"
import alias from "@rollup/plugin-alias"
import commonjs from "@rollup/plugin-commonjs"
import json from "@rollup/plugin-json"
import nodePolyfills from "rollup-plugin-node-polyfills"
import { copy } from "@web/rollup-plugin-copy"

const external = []
const aliasEntries = [
    { find: "https://cdn.jsdelivr.net/npm/@observablehq/stdlib@3.3.1/+esm", replacement: "@observablehq/stdlib" },
    {
        find: "https://cdn.jsdelivr.net/gh/fonsp/msgpack-lite@0.1.27-es.1/dist/msgpack-es.min.mjs",
        replacement: "msgpack-lite/dist/msgpack-es.min.mjs",
    },
    {
        find: "https://esm.sh/seamless-scroll-polyfill@2.1.8/lib/polyfill.js?pin=v113&target=es2020",
        replacement: "seamless-scroll-polyfill/lib/polyfill.js",
    },
    { find: "https://esm.sh/preact@10.13.2?pin=v113&target=es2020", replacement: "preact" },
    { find: "https://esm.sh/preact@10.13.2/hooks?pin=v113&target=es2020", replacement: "preact/hooks" },
    { find: "https://esm.sh/htm@3.1.1?pin=v113&target=es2020", replacement: "htm" },
    { find: "https://cdn.jsdelivr.net/npm/immer@10.1.1/dist/immer.production.mjs", replacement: "immer" },
    { find: "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/+esm", replacement: "lodash-es" },
    {
        find: "https://cdn.jsdelivr.net/gh/JuliaPluto/codemirror-pluto-setup@2001.0.0/dist/index.es.min.js",
        replacement: "@plutojl/codemirror-pluto-setup",
    },
    { find: "https://esm.sh/dompurify@3.2.3?pin=v135", replacement: "dompurify" },
    { find: "https://cdn.jsdelivr.net/npm/ansi_up@5.1.0/+esm", replacement: "ansi_up" },
    { find: "https://cdn.jsdelivr.net/npm/dialog-polyfill@0.5.6/dist/dialog-polyfill.esm.min.js", replacement: "dialog-polyfill" },
    { find: "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/es/highlight.min.js", replacement: "highlight.js" },
    {
        find: "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/es/languages/julia.min.js",
        replacement: "highlight.js/lib/languages/julia",
    },
    {
        find: "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/es/languages/julia-repl.min.js",
        replacement: "highlight.js/lib/languages/julia-repl",
    },
    { find: "https://cdn.jsdelivr.net/npm/requestidlecallback-polyfill@1.0.2/index.js", replacement: "requestidlecallback-polyfill" },
    { find: "https://cdn.jsdelivr.net/npm/vmsg@0.4.0/vmsg.js", replacement: "vmsg" },
    { find: "fs", replacement: "memfs" },
    { find: "path", replacement: "path-browserify" },
]

const plugins = [
    nodePolyfills(),
    alias({
        entries: aliasEntries,
    }),
    resolve({
        browser: true,
        preferBuiltins: false,
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    }),
    commonjs(),
    json(),
    typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: undefined,
        noEmitOnError: false,
        compilerOptions: {
            allowJs: true,
            checkJs: false,
            noEmit: false,
        },
    }),
    copy({ patterns: "standalone/integrations/node-polyfill.js" }),
]

export default [
    // ES Module build
    {
        input: "standalone/index.js",
        output: {
            file: "dist/index.esm.js",
            format: "es",
            sourcemap: true,
        },
        external,
        plugins,
    },
    // CommonJS build
    {
        input: "standalone/index.js",
        output: {
            file: "dist/index.js",
            format: "cjs",
            sourcemap: true,
            exports: "named",
        },
        external,
        plugins,
    },
]
