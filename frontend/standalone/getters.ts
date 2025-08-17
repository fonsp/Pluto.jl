/** Utilities to work with NotebookData */
import { Worker } from "./client.js"

export type CellStatus = "queued" | "running" | "errored" | "done" | "pending"

export function getResult(worker: Worker, cell_id: string) {
    return worker.notebook_state.cell_results[cell_id]
}

export function getSnippetLogs(worker: Worker, cell_id: string) {
    return worker.notebook_state.cell_results[cell_id]?.logs ?? []
}

export function getProgressLogs(worker: Worker, cell_id: string) {
    return (
        getSnippetLogs(worker, cell_id).filter((log) => {
            return "group" in log && log.group === "ProgressLogging"
        }) ?? []
    )
}

export function getOutput(worker: Worker, cell_id: string) {
    return worker.notebook_state.cell_results[cell_id].output
}

export function getStatus(worker: Worker, cell_id: string): CellStatus {
    const r = getResult(worker, cell_id)
    return r.queued ? "queued" : r.running ? "running" : r.errored ? "errored" : r.runtime > 0 ? "done" : "pending"
}

export function getMime(worker: Worker, cell_id: string): ["text/plain" | "text/html" | string, any] {
    const result = getResult(worker, cell_id)
    return [result.output.mime, result.output.body]
}
