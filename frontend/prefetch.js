import { parse_launch_params } from "./common/parse_launch_params.js"

const launch_params = parse_launch_params()

const maybe_urls = [launch_params.statefile, launch_params.notebookfile, launch_params.recording_url, launch_params.recording_audio_url]

maybe_urls.forEach((url) => {
    if (url && new URL(url).protocol === "https:") {
        console.log({ url })
        let link = document.createElement("link")
        link.rel = "prefetch"
        link.href = url
        document.head.appendChild(link)
    }
})
