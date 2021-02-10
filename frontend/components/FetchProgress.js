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
        : html`<div
              style="
              width: 200px;
              height: 27px;
              background: white;
              border: 5px solid #d1d9e4;
              border-radius: 6px;
              position: fixed;
              left: calc(50vw - 100px);
              top: calc(50vh - 50px);
              z-index: 300;
              box-sizing: content-box;
"
          >
              <div
                  style=${{
                      height: "100%",
                      width: progress * 200 + "px",
                      background: "rgb(117 135 177)",
                  }}
              ></div>
          </div>`
