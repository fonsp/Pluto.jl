import _ from "../imports/lodash.js"
import { html, useState } from "../imports/Preact.js"

export const WelcomeViewer = () => {
    const [url, setUrl] = useState("")
    const prepare_url = () => {
        const viewer_url = `/viewer.html?url=${url}`
        window.location.assign(viewer_url)
    }
    return html`<p>Static viewer:</p>
        <ul id="new">
            <li>
                Open from URL:
                <pluto-filepicker>
                    <!-- TODO: style input -->
                    <div>
                        <input
                            onChange=${(event) => {
                                console.log(event.target.value)
                                setUrl(event.target.value)
                            }}
                            placeholder="Enter URL..."
                        />
                    </div>
                    <button onClick=${prepare_url}>View</button>
                </pluto-filepicker>
            </li>
        </ul>`
}
