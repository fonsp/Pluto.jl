/**
 * Example usage of the Pluto Notebook API
 */

import { Pluto, parseNotebook, serializeNotebook } from './src/index';

async function exampleUsage() {
  // Connect to Pluto server
  const pluto = new Pluto("http://localhost:1234");

  // Example 1: Create a new notebook from code
  console.log("Creating a new notebook...");
  const notebookContent = `### A Pluto.jl notebook ###
# v0.19.40

using Markdown
using InteractiveUtils

# ╔═╡ ${generateUUID()}
x = 1 + 1

# ╔═╡ ${generateUUID()}
println("x = ", x)

# ╔═╡ Cell order:
# ╠═${generateUUID()}
# ╠═${generateUUID()}
`;

  const notebook = await pluto.createNotebook(notebookContent);
  console.log("Notebook created with ID:", notebook.notebook_id);

  // Example 2: Add a new cell
  const cellId = await notebook.addCell(0, "y = x * 2");
  console.log("Added cell with ID:", cellId);

  // Example 3: Listen for updates
  const unsubscribe = notebook.onUpdate((event) => {
    console.log("Update event:", event.type, event.data);
    
    if (event.type === 'cells_updated') {
      const cell = notebook.getCell(cellId);
      if (cell?.result?.output) {
        console.log("Cell output:", cell.result.output.body);
      }
    }
  });

  // Example 4: Parse an existing notebook file
  const notebookFileContent = await fetch('/path/to/notebook.jl').then(r => r.text());
  const parsedNotebook = parseNotebook(notebookFileContent);
  console.log("Parsed notebook cells:", Object.keys(parsedNotebook.cell_inputs).length);

  // Example 5: Modify and serialize back
  parsedNotebook.cell_inputs[Object.keys(parsedNotebook.cell_inputs)[0]].code = "# Modified code";
  const serialized = serializeNotebook(parsedNotebook);
  console.log("Serialized notebook length:", serialized.length);

  // Clean up
  setTimeout(() => {
    unsubscribe();
    notebook.close();
  }, 5000);
}

// Simple UUID generator for the example
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Run the example
exampleUsage().catch(console.error);