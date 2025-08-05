# @plutojl/notebook-api

TypeScript/JavaScript API for programmatically interacting with Pluto notebooks.

## Installation

```bash
npm install @plutojl/notebook-api
```

## Features

- **Programmatic Control**: Create, modify, and execute Pluto notebooks without the UI
- **Real-time Updates**: Subscribe to notebook state changes via WebSocket
- **Parser/Serializer**: Parse `.jl` notebook files and serialize them back
- **TypeScript Support**: Full type definitions for all APIs
- **Compatible**: Uses the same protocol as Pluto's web interface

## Quick Start

```typescript
import { Pluto, parseNotebook, serializeNotebook } from '@plutojl/notebook-api';

// Connect to a Pluto server
const pluto = new Pluto("http://localhost:1234");

// Create a new notebook
const notebook = await pluto.createNotebook(`
  ### A Pluto.jl notebook ###
  # v0.19.40
  
  x = 1 + 1
`);

// Add cells
const cellId = await notebook.addCell(0, "println(x)");

// Listen for updates
notebook.onUpdate((event) => {
  console.log("Update:", event.type, event.data);
});

// Parse existing notebooks
const content = await fs.readFile('notebook.jl', 'utf-8');
const parsed = parseNotebook(content);
console.log(`Notebook has ${parsed.cell_order.length} cells`);
```

## API Reference

### Pluto Class

Main class for connecting to a Pluto server.

```typescript
const pluto = new Pluto(serverUrl?: string);
```

**Methods:**
- `getRunningNotebooks()`: Get list of notebooks on the server
- `createNotebook(content: string)`: Create a new notebook from content
- `notebook(id: string)`: Get or create a PlutoNotebook instance

### PlutoNotebook Class

Represents a single notebook connection.

**Methods:**
- `connect()`: Establish WebSocket connection
- `addCell(index: number, code: string)`: Add a new cell
- `updateCellCode(id: string, code: string, run?: boolean)`: Update cell code
- `deleteCells(ids: string[])`: Delete cells
- `getCell(id: string)`: Get cell data
- `getCells()`: Get all cells in order
- `restart()`: Restart the notebook process
- `interrupt()`: Interrupt execution
- `shutdown()`: Shutdown the notebook
- `onUpdate(callback)`: Subscribe to updates
- `isIdle()`: Check if notebook is idle

### Parser Functions

```typescript
// Parse a .jl file into NotebookData
const notebook = parseNotebook(content: string, path?: string);

// Serialize NotebookData back to .jl format
const content = serializeNotebook(notebook: NotebookData);
```

## Types

The package exports all relevant TypeScript types:

```typescript
import type {
  NotebookData,
  CellInputData,
  CellResultData,
  CellMetaData,
  UpdateEvent,
  ConnectionStatusEvent
} from '@plutojl/notebook-api';
```

## Use Cases

- **Testing**: Automated testing of Julia code in notebooks
- **CI/CD**: Run notebooks in continuous integration pipelines
- **Custom Interfaces**: Build alternative UIs for Pluto
- **Automation**: Batch processing of notebooks
- **Education**: Create interactive Julia tutorials

## Requirements

- Pluto.jl server running (typically on port 1234)
- Node.js 16+ or modern browser with ES modules support

## License

MIT