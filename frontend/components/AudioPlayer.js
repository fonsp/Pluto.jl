import { createSilentAudio } from "../common/AudioRecording"
import { html, useEffect, useState, useRef, useLayoutEffect } from "../imports/Preact.js"

export const AudioPlayer = ({ onPlay, src, length }) => {
    const element_ref = useRef()

    useLayoutEffect(() => {
        if (src == null) {
            let sourceje = createSilentAudio(length)
            element_ref.current.src = sourceje
        } else {
            element_ref.current.src = src
        }
    }, [])

    return html`<audio ref=${element_ref} onPlay=${onPlay} controls></audio>`
}
