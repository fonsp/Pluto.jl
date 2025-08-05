import typescript from "@rollup/plugin-typescript"
import resolve from "@rollup/plugin-node-resolve"

export default [
    // ES Module build
    {
        input: "standalone/index.ts",
        output: {
            file: "dist/index.esm.js",
            format: "es",
            sourcemap: true,
        },
        external: ["immer"],
        plugins: [
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
            resolve({
                browser: true,
                preferBuiltins: false,
                extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
            }),
        ],
    },
    // CommonJS build
    {
        input: "standalone/index.ts",
        output: {
            file: "dist/index.js",
            format: "cjs",
            sourcemap: true,
            exports: "named",
        },
        external: ["immer"],
        plugins: [
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
            resolve({
                browser: true,
                preferBuiltins: false,
                extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
            }),
        ],
    },
]
