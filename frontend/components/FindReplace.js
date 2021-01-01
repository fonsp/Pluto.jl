import { clear_all_markers } from "../common/FindReplace.js"
import TextMarker from "../common/TextMarker.js"
import { html, useState, useRef, useEffect } from "../imports/Preact.js"

const enter_key = 13

const get_codeMirrors = () => {
    return Array.from(document.querySelectorAll(".CodeMirror")).map((cm_node) => ({ cell_id: cm_node.parentElement.parentElement.id, cm: cm_node.CodeMirror }))
}

export const FindReplace = () => {
    // for reference!!
    const find_replace_state = {
        visible: false,
        textmarkers: [],
        word: "", //
        marker: null,
        previous: null,
    }
    const [word, set_word] = useState("")
    const [visible, set_visible] = useState(false)
    const [textmarkers, set_textmarkers] = useState([])
    const [marker, set_marker] = useState(null)
    const [previous, set_previous] = useState(null)

    const [replace_value, set_replace_value] = useState(null)
    const input_find = useRef(null)
    const clear_all_markers = () => textmarkers.forEach((each_marker) => each_marker.clear_highlighting())
    const add_textmarkers = () => {
        clear_all_markers()
        const tms = get_codeMirrors().flatMap(({ cell_id, cm }) => {
            const localCursors = []
            const cursor = cm.getSearchCursor(word)
            while (cursor.findNext()) {
                const textmarker = new TextMarker(cell_id, cm, cursor.from(), cursor.to())
                localCursors.push(textmarker)
            }
            return localCursors
        })
        set_textmarkers(tms)
        set_marker(tms[0] || null)
    }

    const update_findreplace_word = (word) => {
        if (word == "") {
            clear_all_markers()
        }
        marker?.deselect()
        set_word(word)
        set_marker(null)
        set_previous(null)
    }

    const find_next = () => {
        const { length } = textmarkers
        const markerIndex = textmarkers.indexOf(marker)
        set_previous(marker)
        set_marker(textmarkers[(markerIndex + 1) % length])
    }

    const replace_with = (word) => {
        marker?.replace_with(word)
        // replace (even if nothing is selected) results in a find-next
        find_next()
    }
    const handle_find_value_change = (event) => {
        // Enter
        if (event.keyCode === enter_key) {
            find_next()
        } else {
            set_word(event.target.value)
        }
    }

    const jump_to_find = () => {
        input_find.current?.focus()
        // Not fixed yet: Must only be carried out upon either selecting a new word or opening the panel
        //input_find.current.select()
    }
    const handler = (ev) => {
        const { path, ctrlKey, key } = ev
        console.log(ev)
        if (!((ctrlKey && key === "f") || key === "F3")) return
        ev.preventDefault() // Don't open normal find
        console.log("making this", !visible)
        set_visible(!visible)
    }
    useEffect(() => {
        document.body.addEventListener("keydown", handler)
        return () => document.body.removeEventListener("keydown", handler)
    }, [handler])

    useEffect(() => {
        if (visible && input_find.current) jump_to_find()
    }, [visible, input_find.current])

    useEffect(() => jump_to_find(), [word])

    useEffect(() => add_textmarkers(), [word])

    return html`<div id="findreplace">
        <aside id="findreplace_container" class=${visible ? "show_findreplace" : ""}>
            <div id="findform">
                <input type="text" ref=${input_find} value=${word} onKeyUp=${handle_find_value_change} />
                <button onClick=${find_next}>Next</button>
            </div>
            <div id="replaceform">
                <input
                    type="text"
                    value=${replace_value}
                    onKeyUp=${(ev) => {
                        set_replace_value(ev.target.value)
                    }}
                />
                <button onClick=${() => replace_with(replace_value)}>Replace</button>
                <button
                    onClick=${() =>
                        textmarkers.forEach((each_marker) => {
                            each_marker.replace_with(replace_value)
                        })}
                >
                    All
                </button>
            </div>
        </aside>
    </div>`
}
