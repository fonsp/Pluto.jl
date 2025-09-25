import { defineConfig } from "vite"
import { resolve } from "path"
import { svelte } from "@sveltejs/vite-plugin-svelte"

export default defineConfig({
    root: "frontend",
    base: "/",
    plugins: [
        svelte({
            configFile: false,
            compilerOptions: {
                dev: true,
                compatibility: {
                    componentApi: 4,
                },
            },
        }),
    ],
    build: {
        outDir: "../frontend-dist",
        emptyOutDir: true,
        rollupOptions: {
            input: {
                index: resolve(__dirname, "frontend/index.html"),
                editor: resolve(__dirname, "frontend/editor.html"),
                error: resolve(__dirname, "frontend/error.jl.html"),
                // "migration-test": resolve(__dirname, "frontend/migration-test.html"),
            },
        },
    },
    server: {
        port: 1234,
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "frontend"),
            "@components": resolve(__dirname, "frontend/components"),
            "@stores": resolve(__dirname, "frontend/stores"),
            "@common": resolve(__dirname, "frontend/common"),
        },
    },
})
