import {decode} from "https://deno.land/std@0.204.0/encoding/base64.ts";
import {TextLineStream} from "https://deno.land/std@0.204.0/streams/mod.ts";
import Delta from "npm:quill-delta"

const text = new Delta().insert("🍕")
const edits_a = new Delta().retain(2).insert("🍍")

console.log(text.compose(edits_a))
