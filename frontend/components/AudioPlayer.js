import { createSilentAudio } from "../common/AudioRecording.js"
import { html, useEffect, useState, useRef, useLayoutEffect } from "../imports/Preact.js"

let run = (x) => x()

export const AudioPlayer = ({ onPlay, src, loaded_recording }) => {
    const element_ref = useRef()

    useLayoutEffect(() => {
        run(async () => {
            if (src == null) {
                let fake_source = createSilentAudio((await loaded_recording).steps.length)
                element_ref.current.src = fake_source
            } else {
                element_ref.current.src = src
            }
        })
    }, [])

    return html`<audio ref=${element_ref} onPlay=${onPlay} controls></audio>`
}
