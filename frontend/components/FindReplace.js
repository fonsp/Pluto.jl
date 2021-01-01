import TextMarker from "../common/TextMarker.js"
import { html, useState, useRef, useEffect } from "../imports/Preact.js"

const enter_key = 13

const get_codeMirrors = () => {
    return Array.from(document.querySelectorAll("pluto-input .CodeMirror")).map((cm_node) => ({
        cell_id: cm_node.parentElement.parentElement.id,
        cm: cm_node.CodeMirror,
    }))
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
    const clear_all_markers = () => {
        textmarkers.forEach((each_marker) => {
            each_marker?.clear_highlighting()
            each_marker?.deselect()
        })
    }
    const create_textmarkers = (replaceText) => {
        clear_all_markers()
        const tms = get_codeMirrors().flatMap(({ cell_id, cm }) => {
            const localCursors = []
            const cursor = cm.getSearchCursor(word)
            while (cursor.findNext()) {
                if (replaceText) cursor.replace(replaceText)
                const textmarker = new TextMarker(cell_id, cm, cursor.from(), cursor.to())
                localCursors.push(textmarker)
            }
            return localCursors
        })
        set_textmarkers(tms)
        const [firstmarker] = tms
        set_marker(firstmarker)
        firstmarker?.select()
        return firstmarker
    }

    const find_next = () => {
        const { length } = textmarkers
        const markerIndex = textmarkers.indexOf(marker)
        const nextMarker = textmarkers[(markerIndex + 1) % length]
        set_previous(marker)
        set_marker(nextMarker)
        marker?.deselect()
        nextMarker?.select()
    }

    const replace_with = (word_to_replace_with = "") => {
        marker?.replace_with(word_to_replace_with)
        // Now we need to recalculate the markers of this codemirror, starting at the new end position of marker.
        const offset = word_to_replace_with?.length - word.length
        textmarkers.forEach((tm) => {
            // If a marker is in the same cm and after the replaced marker, adjust offsets
            if (tm.codemirror === marker.codemirror && (tm.from.line > marker.to.line || (tm.from.line === marker.to.line && tm.from.ch > marker.to.ch))) {
                console.log("offsetting", tm, " by ", offset)
                tm.offset(offset)
            }
        })
        // replace (even if nothing is selected) results in a find-next
        // recalculate all markers!
        find_next()
    }

    const replace_all = (with_word) => {
        clear_all_markers()
        get_codeMirrors().forEach(({ cell_id, cm }) => {
            const localCursors = []
            const cursor = cm.getSearchCursor(word)
            while (cursor.findNext()) {
                if (with_word) cursor.replace(with_word)
            }
            return localCursors
        })
        create_textmarkers()
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
        console.log(key)
        if (key === "Escape") {
            clear_all_markers()
            set_visible(false)
        }
        if (!((ctrlKey && key === "f") || (ctrlKey && key === "h") || key === "F3")) return
        // Don't open normal find
        ev.preventDefault()
        // Find CM if in event path
        const cm = path.find(({ CodeMirror }) => CodeMirror)?.CodeMirror
        const selections = cm?.getSelections?.()
        if (cm && selections?.length) {
            clear_all_markers()
            set_word(selections[0])
            set_visible(true)
            create_textmarkers()
        } else {
            set_visible(!visible)
            visible ? create_textmarkers() : clear_all_markers()
        }
    }
    useEffect(() => {
        document.body.addEventListener("keydown", handler)
        return () => document.body.removeEventListener("keydown", handler)
    }, [handler])

    useEffect(() => {
        if (visible && input_find.current) jump_to_find()
    }, [visible, input_find.current])

    useEffect(() => {
        const firstmarker = create_textmarkers()
        return () => firstmarker?.deselect()
    }, [word])

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
                <button onClick=${() => replace_all(replace_value)}>All</button>
            </div>
        </aside>
    </div>`
}
