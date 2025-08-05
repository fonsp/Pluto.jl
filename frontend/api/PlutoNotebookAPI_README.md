# PlutoNotebookAPI

A programmatic JavaScript API for interacting with Pluto notebooks without requiring the full Editor UI. This API provides the core functionality of the Editor.js component in a lightweight, reusable class.

## Features

- **WebSocket Connection Management**: Automatic connection, reconnection, and error handling
- **Real-time State Synchronization**: Mirrors the exact state structure used by Editor.js
- **Cell Operations**: Create, update, delete, and execute cells programmatically  
- **Event System**: Subscribe to state changes and connection events
- **Reactive Execution**: Leverages Pluto's built-in reactivity for dependent cells
- **Error Handling**: Comprehensive error handling and recovery mechanisms

## State Structure

The API maintains the same state structure as Editor.js, providing access to:

```javascript
{
  notebook_state: {
    notebook_id: string,
    path: string, 
    shortpath: string,
    cell_inputs: { [cell_id]: CellInputData },
    cell_results: { [cell_id]: CellResultData },
    cell_dependencies: CellDependencyGraph,
    cell_order: string[],
    cell_execution_order: string[],
    bonds: BondValuesDict,
    nbpkg: NotebookPkgData,
    metadata: object,
    // ... and more
  },
  cell_inputs_local: { [cell_id]: { code: string } },
  connected: boolean,
  initializing: boolean,
  // ... connection state
}
```

## Basic Usage

```javascript
import { PlutoNotebookAPI } from "./PlutoNotebookAPI.js"

// Create API instance
const api = new PlutoNotebookAPI({
  ws_address: "ws://localhost:1234", // Optional
  notebook_id: "your-notebook-id",   // Optional  
  auto_connect: true                 // Default: true
})

// Wait for connection
api.onConnectionStatus(({ connected }) => {
  if (connected) {
    console.log("Connected to Pluto!")
  }
})

// Get notebook state
const state = api.getNotebookState()
console.log("Notebook:", state.path, "with", state.cell_order.length, "cells")

// Add a new cell
const cellId = await api.addCell(0, "println(\"Hello World!\")")

// Update cell code locally
api.setLocalCellCode(cellId, "x = 42\nprintln(x)")

// Submit changes and execute
await api.setCellsAndRun([cellId])

// Get cell results
const cell = api.getCell(cellId) 
console.log("Output:", cell.result?.output?.body)
```

## API Reference

### Constructor

```javascript
new PlutoNotebookAPI(options = {})
```

**Options:**
- `ws_address` (string): WebSocket address to connect to
- `notebook_id` (string): Specific notebook ID to connect to  
- `auto_connect` (boolean): Whether to automatically connect on instantiation

### Connection Methods

```javascript
// Connect to Pluto backend
await api.connect()

// Disconnect from backend
api.disconnect()

// Check connection status
api.connected // boolean
```

### Notebook State Methods

```javascript
// Get complete notebook state
const state = api.getNotebookState()

// Get specific cell data  
const cell = api.getCell(cell_id)
// Returns: { input: CellInputData, result: CellResultData, local: LocalData }

// Get all cells in order
const cells = api.getCells()

// Check if notebook is idle (not running any cells)
const idle = api.isIdle()
```

### Cell Operations

```javascript
// Update cell code locally (doesn't execute)
api.setLocalCellCode(cell_id, code)

// Submit local changes and run cells
const result = await api.setCellsAndRun([cell_id1, cell_id2])

// Add new cell
const newCellId = await api.addCell(index, code = "")

// Delete cells
await api.deleteCells([cell_id1, cell_id2])

// Interrupt execution
await api.interrupt()
```

### Event Handling

```javascript
// Listen for state changes
const unsubscribe = api.onStateChange((event) => {
  console.log("State changed:", event.type, event.data)
})

// Listen for connection status changes
const unsubscribe2 = api.onConnectionStatus(({ connected, hopeless }) => {
  if (connected) console.log("Connected")
  else if (hopeless) console.log("Connection lost")  
  else console.log("Reconnecting...")
})

// Unsubscribe when done
unsubscribe()
unsubscribe2()
```

### State Change Events

The `onStateChange` handler receives events with these types:

- `cell_local_update`: Local cell code was updated
- `cells_updated`: Cells were submitted and executed
- `notebook_updated`: Notebook state was updated via WebSocket patches
- `cell_added`: New cell was added
- `cells_deleted`: Cells were deleted

## Advanced Usage

### Batch Operations

```javascript
// Add multiple cells
const cellIds = []
cellIds.push(await api.addCell(0, "a = 10"))
cellIds.push(await api.addCell(1, "b = 20"))
cellIds.push(await api.addCell(2, "c = a + b"))

// Update multiple cells locally
api.setLocalCellCode(cellIds[0], "a = 15")
api.setLocalCellCode(cellIds[1], "b = 25")

// Run updated cells (reactivity handles dependents)
await api.setCellsAndRun([cellIds[0], cellIds[1]])
```

### Waiting for Execution

```javascript
// Start execution
api.setCellsAndRun([cellId])

// Wait for completion
while (!api.isIdle()) {
  await new Promise(resolve => setTimeout(resolve, 100))
}

console.log("Execution complete!")
```

### Error Handling

```javascript
try {
  await api.setCellsAndRun([cellId])
  
  const cell = api.getCell(cellId)
  if (cell.result?.errored) {
    console.log("Cell error:", cell.result.output?.body)
  }
} catch (error) {
  console.error("API error:", error.message)
}
```

## Integration with Existing Code

The PlutoNotebookAPI is designed to integrate seamlessly with existing Pluto frontend code:

- **State Compatibility**: Uses the same state structure as Editor.js
- **WebSocket Reuse**: Built on the same PlutoConnection infrastructure  
- **Event System**: Compatible with existing Pluto event patterns
- **Import Structure**: Uses the same import paths as other frontend modules

## Use Cases

- **Automated Testing**: Programmatically test notebook functionality
- **Batch Processing**: Update multiple notebooks without manual interaction
- **Custom UIs**: Build alternative interfaces for specific workflows
- **Integration Testing**: Test backend changes against real notebook interactions
- **Headless Execution**: Run notebooks in automated environments
- **Custom Dashboards**: Create specialized viewing/editing interfaces

## Examples

See `PlutoNotebookAPI_example.js` for complete working examples covering:

- Basic notebook interaction
- Real-time state monitoring  
- Batch cell operations
- Error handling and recovery
- Event-driven workflows

## Architecture Notes

The API is built on the same foundation as the Editor.js component:

- **PlutoConnection.js**: WebSocket connection and message handling
- **Immer.js**: Immutable state updates with patches
- **MsgPack**: Efficient binary serialization
- **Event System**: Decoupled communication via handlers

This ensures complete compatibility with the existing Pluto backend while providing a cleaner programmatic interface.