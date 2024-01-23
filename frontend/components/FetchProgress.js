import { html } from "../imports/Preact.js"

export const read_Uint8Array_with_progress = async (response, on_progress) => {
    if (response.headers.has("Content-Length")) {
        const length = response.headers.get("Content-Length")

        const reader = response.body.getReader()

        let receivedLength = 0
        let chunks = []
        while (true) {
            const { done, value } = await reader.read()

            if (done) {
                break
            }

            chunks.push(value)
            receivedLength += value.length

            on_progress(Math.min(1, receivedLength / length))
        }

        on_progress(1)

        const buffer = new Uint8Array(receivedLength)
        let position = 0
        for (let chunk of chunks) {
            buffer.set(chunk, position)
            position += chunk.length
        }
        return buffer
    } else {
        return new Uint8Array(await response.arrayBuffer())
    }
}

export const FetchProgress = ({ progress }) =>
    progress == null || progress === 1
        ? null
        : html`<progress class="statefile-fetch-progress" max="100" value=${progress === "indeterminate" ? undefined : Math.round(progress * 100)}>
              ${progress === "indeterminate" ? null : Math.round(progress * 100)}%
          </progress>`
