import { html, useEffect, useReducer } from "../common/Preact.js"

import { Cell } from "./Cell.js"

export const Notebook = ({
    cells,
    on_update_doc_query,
    on_cell_input,
    on_focus_neighbor,
    disable_input,
    focus_after_creation,
    all_completed_promise,
    selected_friends,
    requests,
    set_dispatch_find_replace,
    client,
    notebook_id,
}) => {

    /*
    Todos: Somehow remove textmarkers after we change: word or by replacing.
    Maybe something like: state variable 'requires_parsing' that is set if (a) word changes or (b) replacement happended
    => this should trigger select_same_words.
    */

    const reduce_next = (state, action) => {
      if(state.marker_index + 1 == state.textmarkers.length){
        return { ...state, marker_index: 0, previous_index: state.marker_index }
      }
      return { ...state, marker_index: state.marker_index + 1, previous_index: state.marker_index }
    }

    const [find_replace_state, dispatch_find_replace] = useReducer((state, action) => {
      switch (action.type) {
        case 'add_textmarkers':
          return { ...state, textmarkers: [...state.textmarkers, ...action.textmarkers] }

        case 'next':
          if(state.textmarkers.length == 0){
            return state
          }

          if(!state.marker){
            return { ...state, marker: state.textmarkers[0] }
          }

          const marker_index = state.textmarkers.indexOf(state.marker)
          if(marker_index + 1 == state.textmarkers.length){
            return { ...state, marker: state.textmarkers[0], previous: state.textmarkers[marker_index] }
          }

          return { ...state, marker: state.textmarkers[marker_index + 1], previous: state.textmarkers[marker_index] }

        case 'refresh_marker':
          const old_marker_index = state.textmarkers.indexOf(state.marker)
          const textmarkers = state.textmarkers.filter((o, index) => index != old_marker_index)

          return { ...state, marker: textmarkers[old_marker_index], previous: null, textmarkers: textmarkers, replace_with: null }

        case 'reset':
          return { ...state, textmarkers: [], replace_with: null, all: false }

        case 'replace':
          return { ...state, replace_with: action.replace_with, all: action.all }

        case 'word':
          return { ...state, word: action.word, textmarkers: [] }
      }
    }, { marker: null, previous: null, word: null, replace_with: null, textmarkers: [], all: false })

    useEffect(() => {
      set_dispatch_find_replace(dispatch_find_replace)
    }, [])

    useEffect(() => {
      const event = new CustomEvent("select_same_words", { detail: { word: find_replace_state.word }, cancelable: true })
      window.dispatchEvent(event)
    }, [find_replace_state.word])

    useEffect(() => {
      if(find_replace_state.previous){
        find_replace_state.previous.deselect()
      }

      if(find_replace_state.marker) {
        find_replace_state.marker.select()
      }
    }, [find_replace_state.marker])

    useEffect(() => {
      if(find_replace_state.replace_with){
        if(!find_replace_state.all){
          if(find_replace_state.marker) {
            find_replace_state.marker.replace_with(find_replace_state.replace_with)
            dispatch_find_replace({ type: 'refresh_marker'})
          }
        }
        else{
          find_replace_state.textmarkers.forEach((marker) => marker.replace_with(find_replace_state.replace_with) )
          dispatch_find_replace({ type: 'reset'})
        }
      }
    }, [find_replace_state.replace_with, find_replace_state.all])

    return html`
        <pluto-notebook>
            ${cells.map(
                (d) => html`<${Cell}
                    ...${d}
                    key=${d.cell_id}
                    on_update_doc_query=${on_update_doc_query}
                    on_change=${(val) => on_cell_input(d, val)}
                    on_focus_neighbor=${on_focus_neighbor}
                    disable_input=${disable_input}
                    focus_after_creation=${focus_after_creation && !d.pasted}
                    scroll_into_view_after_creation=${d.pasted}
                    all_completed_promise=${all_completed_promise}
                    selected_friends=${selected_friends}
                    requests=${requests}
                    client=${client}
                    notebook_id=${notebook_id}
                    dispatch_mark=${dispatch_find_replace}
                />`
            )}
        </pluto-notebook>
    `
}
