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

    const [find_replace_state, dispatch_find_replace] = useReducer((state, action) => {
      switch (action.type) {
        case 'add_textmarkers':
          return { ...state, textmarkers: [...state.textmarkers, ...action.textmarkers] }

        case 'next':
          if(state.marker_index + 1 == state.textmarkers.length){
            return { ...state, marker_index: 0, previous_index: state.marker_index }
          }
          return { ...state, marker_index: state.marker_index + 1, previous_index: state.marker_index }

        case 'replace':
          return { ...state, replace_with: action.replace_with }

        case 'word':
          return { ...state, word: action.word }
      }
    }, { marker_index: -1, previous_index: -1, word: null, replace_with: null, textmarkers: [] })

    useEffect(() => {
      set_dispatch_find_replace(dispatch_find_replace)
    }, [])

    const select_same_words = () => {
      const event = new CustomEvent("select_same_words", { detail: { word: find_replace_state.word }, cancelable: true })
      window.dispatchEvent(event)
    }

    useEffect(select_same_words, [find_replace_state.word])

    useEffect(() => {
      if(find_replace_state.previous_index >= 0){
        find_replace_state.textmarkers[find_replace_state.previous_index].deselect()
      }

      if(find_replace_state.textmarkers.length > 0) {
        find_replace_state.textmarkers[find_replace_state.marker_index].select()
      }
    }, [find_replace_state.marker_index])

    useEffect(() => {
      if(find_replace_state.textmarkers.length > 0) {
        find_replace_state.textmarkers[find_replace_state.marker_index].replace_with(find_replace_state.replace_with)
      }
    }, [find_replace_state.replace_with])

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
                    focus_after_creation=${focus_after_creation}
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
