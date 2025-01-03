// @ts-ignore
import vmsg from "https://cdn.jsdelivr.net/npm/vmsg@0.4.0/vmsg.js" // when modifying, also modify the version number in all other files.
import { get_included_external_source } from "./external_source.js"

const create_recorder_mp3 = async () => {
    const wasmURL = get_included_external_source("vmsg-wasm")?.href

    if (!wasmURL) throw new Error("wasmURL not found")

    const recorder = new vmsg.Recorder({ wasmURL })

    return {
        start: async () => {
            await recorder.initAudio()
            await recorder.initWorker()
            recorder.startRecording()
        },
        stop: async () => {
            const blob = await recorder.stopRecording()

            return window.URL.createObjectURL(blob)
        },
    }
}

export const create_recorder = () => {
    try {
        return create_recorder_mp3()
    } catch (e) {
        console.error("Failed to create mp3 recorder", e)
    }

    return create_recorder_native()
}

// really nice but it can only record to audio/ogg or sometihng, nothing that works across all browsers
const create_recorder_native = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    let chunks = []
    const mediaRecorder = new MediaRecorder(stream, {})

    mediaRecorder.ondataavailable = function (e) {
        chunks.push(e.data)
    }

    let start_return_promise = new Promise((r) => {
        mediaRecorder.onstart = r
    })
    let stop_return_promise = new Promise((r) => {
        mediaRecorder.onstop = function (e) {
            const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" })
            chunks = []
            const audioURL = window.URL.createObjectURL(blob)

            r(audioURL)
        }
    })

    return {
        start: () => {
            mediaRecorder.start()
            start_return_promise
        },
        stop: () => {
            mediaRecorder.stop()
            return stop_return_promise
        },
    }
}

// taken from https://github.com/edoudou/create-silent-audio

// original license from https://github.com/edoudou/create-silent-audio/blob/master/LICENSE

/*

MIT License

Copyright (c) 2019 Edouard Short

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

export function createSilentAudio(time, freq = 44100) {
    const length = time * freq
    // @ts-ignore
    const AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext
    if (!AudioContext) {
        console.log("No Audio Context")
    }
    const context = new AudioContext()
    const audioFile = context.createBuffer(1, length, freq)
    return URL.createObjectURL(bufferToWave(audioFile, length))
}

function bufferToWave(abuffer, len) {
    let numOfChan = abuffer.numberOfChannels,
        length = len * numOfChan * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [],
        i,
        sample,
        offset = 0,
        pos = 0

    // write WAVE header
    setUint32(0x46464952)
    setUint32(length - 8)
    setUint32(0x45564157)

    setUint32(0x20746d66)
    setUint32(16)
    setUint16(1)
    setUint16(numOfChan)
    setUint32(abuffer.sampleRate)
    setUint32(abuffer.sampleRate * 2 * numOfChan)
    setUint16(numOfChan * 2)
    setUint16(16)

    setUint32(0x61746164)
    setUint32(length - pos - 4)

    // write interleaved data
    for (i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i))

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            // interleave channels
            sample = Math.max(-1, Math.min(1, channels[i][offset])) // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0 // scale to 16-bit signed int
            view.setInt16(pos, sample, true) // write 16-bit sample
            pos += 2
        }
        offset++ // next source sample
    }

    // create Blob
    return new Blob([buffer], { type: "audio/wav" })

    function setUint16(data) {
        view.setUint16(pos, data, true)
        pos += 2
    }

    function setUint32(data) {
        view.setUint32(pos, data, true)
        pos += 4
    }
}
