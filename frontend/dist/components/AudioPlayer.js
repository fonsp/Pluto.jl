"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioPlayer = void 0;
const lodash_js_1 = __importDefault(require("../imports/lodash.js"));
const AudioRecording_js_1 = require("../common/AudioRecording.js");
const Preact_js_1 = require("../imports/Preact.js");
let run = (x) => x();
const AudioPlayer = ({ onPlay, src, loaded_recording, audio_element_ref }) => {
    (0, Preact_js_1.useLayoutEffect)(() => {
        run(async () => {
            if (src == null) {
                // We create a silent audio track to play. The duration is the last timestamp of the loaded recording state.
                let last_timestamp = (things) => lodash_js_1.default.last([[0, null], ...things])[0];
                let fake_duration = Math.max(last_timestamp((await loaded_recording).scrolls), last_timestamp((await loaded_recording).steps));
                fake_duration = Math.ceil(fake_duration + 0.1);
                console.log({ fake_duration });
                let fake_source = (0, AudioRecording_js_1.createSilentAudio)(fake_duration);
                audio_element_ref.current.src = fake_source;
            }
            else {
                audio_element_ref.current.src = src;
            }
        });
    }, []);
    return (0, Preact_js_1.html) `<div class="recording-playback"><audio ref=${audio_element_ref} onPlay=${onPlay} controls></audio></div>`;
};
exports.AudioPlayer = AudioPlayer;
