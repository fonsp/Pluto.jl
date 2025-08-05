#!/usr/bin/env node

/**
 * Test script for NotebookParser.js
 * Tests round-trip parsing and serialization of sample notebooks
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import parseNotebook, { serializeNotebook } from "../standalone/NotebookParser.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SAMPLE_DIR = path.join(__dirname, "../../sample")

/**
 * Get all .jl files from the sample directory
 */
function getSampleNotebooks() {
    if (!fs.existsSync(SAMPLE_DIR)) {
        console.error(`Sample directory not found: ${SAMPLE_DIR}`)
        return []
    }

    return fs
        .readdirSync(SAMPLE_DIR)
        .filter((file) => file.endsWith(".jl"))
        .map((file) => path.join(SAMPLE_DIR, file))
}

/**
 * Normalize whitespace for comparison
 */
function normalizeContent(content) {
    return content
        .split("\n")
        .map((line) => line.trimEnd()) // Remove trailing whitespace
        .join("\n")
        .replace(/\n+$/, "\n") // Normalize ending newlines
}

/**
 * Compare two strings and return detailed diff information
 */
function compareContent(original, generated, filename) {
    const originalNorm = normalizeContent(original)
    const generatedNorm = normalizeContent(generated)

    if (originalNorm === generatedNorm) {
        return { identical: true, diff: null }
    }

    const originalLines = originalNorm.split("\n")
    const generatedLines = generatedNorm.split("\n")

    const diff = []
    const maxLines = Math.max(originalLines.length, generatedLines.length)

    for (let i = 0; i < maxLines; i++) {
        const origLine = originalLines[i] || ""
        const genLine = generatedLines[i] || ""

        if (origLine !== genLine) {
            diff.push({
                line: i + 1,
                original: origLine,
                generated: genLine,
            })
        }
    }

    return {
        identical: false,
        diff,
        summary: {
            originalLines: originalLines.length,
            generatedLines: generatedLines.length,
            differentLines: diff.length,
        },
    }
}

/**
 * Test a single notebook file
 */
function testNotebook(filePath) {
    const filename = path.basename(filePath)
    console.log(`\n=== Testing ${filename} ===`)

    try {
        // Read original content
        const originalContent = fs.readFileSync(filePath, "utf-8")
        console.log(`Original: ${originalContent.length} chars, ${originalContent.split("\n").length} lines`)

        // Parse notebook
        const notebookData = parseNotebook(originalContent, filePath)
        console.log(
            `Parsed: ${Object.keys(notebookData.cell_inputs).length} cells, order: [${notebookData.cell_order.slice(0, 3).join(", ")}${
                notebookData.cell_order.length > 3 ? "..." : ""
            }]`
        )

        // Serialize back
        const generatedContent = serializeNotebook(notebookData)
        console.log(`Generated: ${generatedContent.length} chars, ${generatedContent.split("\n").length} lines`)

        // Compare
        const comparison = compareContent(originalContent, generatedContent, filename)

        if (comparison.identical) {
            console.log("✅ IDENTICAL - Perfect round-trip!")
            return { filename, status: "PASS", diff: null }
        } else {
            console.log(`❌ DIFFERENCES FOUND`)
            console.log(`   Lines changed: ${comparison.diff.length}`)
            console.log(`   Original lines: ${comparison.summary.originalLines}`)
            console.log(`   Generated lines: ${comparison.summary.generatedLines}`)

            // Show first few differences
            const showDiffs = Math.min(5, comparison.diff.length)
            for (let i = 0; i < showDiffs; i++) {
                const d = comparison.diff[i]
                console.log(`   Line ${d.line}:`)
                console.log(`     - "${d.original}"`)
                console.log(`     + "${d.generated}"`)
            }

            if (comparison.diff.length > showDiffs) {
                console.log(`   ... and ${comparison.diff.length - showDiffs} more differences`)
            }

            return { filename, status: "FAIL", diff: comparison.diff }
        }
    } catch (error) {
        console.log(`💥 ERROR: ${error.message}`)
        console.log(error.stack)
        return { filename, status: "ERROR", error: error.message }
    }
}

/**
 * Main test runner
 */
function main() {
    console.log("🧪 Pluto Notebook Parser Round-Trip Test")
    console.log("==========================================")

    const sampleFiles = getSampleNotebooks()

    if (sampleFiles.length === 0) {
        console.log("No sample notebooks found!")
        process.exit(1)
    }

    console.log(`Found ${sampleFiles.length} sample notebooks`)

    const results = []

    for (const filePath of sampleFiles) {
        const result = testNotebook(filePath)
        results.push(result)
    }

    // Summary
    console.log("\n🏁 SUMMARY")
    console.log("===========")

    const passed = results.filter((r) => r.status === "PASS").length
    const failed = results.filter((r) => r.status === "FAIL").length
    const errors = results.filter((r) => r.status === "ERROR").length

    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`💥 Errors: ${errors}`)
    console.log(`📊 Total:  ${results.length}`)

    if (failed > 0 || errors > 0) {
        console.log("\n❌ FAILED TESTS:")
        results
            .filter((r) => r.status !== "PASS")
            .forEach((r) => {
                console.log(`   ${r.filename}: ${r.status}${r.error ? ` - ${r.error}` : ""}`)
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
