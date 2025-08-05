#!/usr/bin/env node

/**
 * Test script for NotebookParser.js that ignores whitespace differences
 * Tests that the parser correctly preserves all non-whitespace content
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import parseNotebook, { serializeNotebook } from "../standalone/NotebookParser.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SAMPLE_DIR = path.join(__dirname, "../../sample")

// List of notebooks that currently pass with perfect round-trip
const PASSING_NOTEBOOKS = [
    "Basic mathematics.jl",
    "Basic.jl",
    "Getting started.jl",
    "Interactivity.jl",
    "JavaScript.jl",
    "Markdown.jl",
    "Plots.jl.jl",
    "PlutoUI.jl.jl",
    "Tower of Hanoi.jl",
    "notebook_with_metadata.jl",
    "test1.jl",
    "test_embed_display.jl",
]

/**
 * Normalize content by removing blank lines and trimming whitespace
 */
function normalizeForComparison(content) {
    return content
        .split("\n")
        .map((line) => line.trim()) // Remove leading/trailing whitespace
        .filter((line) => line !== "") // Remove blank lines
        .join("\n")
}

/**
 * Test a single notebook file
 */
function testNotebook(filePath) {
    const filename = path.basename(filePath)

    try {
        // Read original content
        const originalContent = fs.readFileSync(filePath, "utf-8")

        // Parse notebook
        const notebookData = parseNotebook(originalContent, filePath)

        // Serialize back
        const generatedContent = serializeNotebook(notebookData)

        // Normalize both for comparison
        const originalNormalized = normalizeForComparison(originalContent)
        const generatedNormalized = normalizeForComparison(generatedContent)

        if (originalNormalized === generatedNormalized) {
            return {
                filename,
                status: "PASS",
                message: "Content matches (ignoring whitespace)",
            }
        } else {
            // Find first difference
            const origLines = originalNormalized.split("\n")
            const genLines = generatedNormalized.split("\n")

            for (let i = 0; i < Math.min(origLines.length, genLines.length); i++) {
                if (origLines[i] !== genLines[i]) {
                    return {
                        filename,
                        status: "FAIL",
                        message: `Content differs at normalized line ${i + 1}`,
                        diff: {
                            line: i + 1,
                            original: origLines[i],
                            generated: genLines[i],
                        },
                    }
                }
            }

            return {
                filename,
                status: "FAIL",
                message: `Different line count: ${origLines.length} vs ${genLines.length}`,
            }
        }
    } catch (error) {
        return {
            filename,
            status: "ERROR",
            message: error.message,
        }
    }
}

/**
 * Main test runner
 */
function main() {
    console.log("🧪 Pluto Notebook Parser Test (Whitespace Insensitive)")
    console.log("========================================================")
    console.log(`Testing ${PASSING_NOTEBOOKS.length} notebooks that should pass...\n`)

    const results = []

    for (const notebookName of PASSING_NOTEBOOKS) {
        const filePath = path.join(SAMPLE_DIR, notebookName)
        const result = testNotebook(filePath)
        results.push(result)

        const statusIcon = result.status === "PASS" ? "✅" : result.status === "FAIL" ? "❌" : "💥"
        console.log(`${statusIcon} ${result.filename}: ${result.message}`)

        if (result.diff) {
            console.log(`   Line ${result.diff.line}:`)
            console.log(`     - "${result.diff.original.substring(0, 60)}${result.diff.original.length > 60 ? "..." : ""}"`)
            console.log(`     + "${result.diff.generated.substring(0, 60)}${result.diff.generated.length > 60 ? "..." : ""}"`)
        }
    }

    // Summary
    console.log("\n📊 SUMMARY")
    console.log("===========")

    const passed = results.filter((r) => r.status === "PASS").length
    const failed = results.filter((r) => r.status === "FAIL").length
    const errors = results.filter((r) => r.status === "ERROR").length

    console.log(`✅ Passed: ${passed}/${results.length}`)
    console.log(`❌ Failed: ${failed}/${results.length}`)
    console.log(`💥 Errors: ${errors}/${results.length}`)

    if (failed > 0 || errors > 0) {
        console.log("\n❌ FAILURES:")
        results
            .filter((r) => r.status !== "PASS")
            .forEach((r) => {
                console.log(`   ${r.filename}: ${r.message}`)
            })

        process.exit(1)
    } else {
        console.log("\n🎉 All tests passed!")
        process.exit(0)
    }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    main()
}
