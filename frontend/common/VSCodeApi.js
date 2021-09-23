// If we are running inside a VS Code WebView, then this exposes the API.

// @ts-ignore
export const available = window.acquireVsCodeApi != null
export const api = available
    ? // @ts-ignore
      window.acquireVsCodeApi()
    : {
          postMessage: console.error,
      }
