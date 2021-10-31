import _ from "../imports/lodash.js"
import { createSilentAudio } from "../common/AudioRecording.js"
import { html, useEffect, useState, useRef, useLayoutEffect } from "../imports/Preact.js"

let run = (x) => x()

export const AudioPlayer = ({ onPlay, src, loaded_recording, audio_element_ref }) => {
    useLayoutEffect(() => {
        run(async () => {
            if (src == null) {
                console.log(Math.ceil(_.last((await loaded_recording).steps)[0] + 0.1))
                let fake_source = createSilentAudio(Math.ceil(_.last((await loaded_recording).steps)[0] + 0.1))
                audio_element_ref.current.src = fake_source
            } else {
                audio_element_ref.current.src = src
            }
        })
    }, [])

    return html`<div class="recording-playback"><audio ref=${audio_element_ref} onPlay=${onPlay} controls></audio></div>`
}
