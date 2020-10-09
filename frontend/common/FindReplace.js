import TextMarker from "./TextMarker.js"

/**
 * @typedef {Object} FindReplaceState
 * @property {boolean} visible
 * @property {Array} textmarkers
 * @property {string} word
 * @property {TextMarker} marker
 * @property {TextMarker} previous
 */

/**
 * Initialize the state for FindReplace.
 * @return {FindReplaceState} Initial state
 */
export const init_findreplace = () => {
  return {
    visible: false,
    textmarkers : [],
    word: "",
    marker: null,
    previous: null
  }
}

/**
 * Convenience function for toggeling the find-replace extension. This function
 * also handles the css.
 * @param {FindReplaceState} state
 * @param {boolean} code_selected Indicating whether some code is currently selected in a codemirror
 * @return {FindReplaceState} The new state
 */
export const toggle_findreplace = (state, code_selected) => {
  const class_applied = is_class_applied()
  const visible = !class_applied

  if(!code_selected || !class_applied){
    toggle_css()
    return { ...state, visible: visible }
  }
  return state
}

/**
 * Convenience function to clear the highlighting of all text marks
 * @param {Array<TextMarker>} textmarkers
 */
export const clear_highlighting_all = (textmarkers) => {
  textmarkers.forEach((marker) => marker.clear_highlighting())
}

/**
 * Implements the find next behaviour. Performs side-effects (i.e. changing the
 * selection of matches) and returns the updated state.
 * @param {FindReplaceState} state
 * @return {FindReplaceState} Updated state
 */
export const select_next_match = (state) => {
  const nextState = next_marker(state)

  if(nextState.previous){
    nextState.previous.deselect()
  }

  if(nextState.marker) {
    nextState.marker.select()
  }
  return nextState
}

/**
 * Convenience function to remove all internal markers in the CodeMirror instance
 * @param {window.CodeMirror}
 */
export const clear_all_markers = (cm) => cm.getAllMarks().forEach((mark) => mark.clear())

/**
 * Procedure to find all matches in a codemirror. Converts the matches into
 * a TextMarker instance.
 * @param {window.CodeMirror} codemirror
 * @param {string} word
 * @param {string} cell_id
 * @return {Array<TextMarker>}
 */
export const find_all_markers = (codemirror, word, cell_id) => {
  var markers = []
  var cursor = codemirror.getSearchCursor(word)

  while(cursor.findNext()){

    const textmarker = new TextMarker(cell_id, codemirror, cursor.from(), cursor.to())
    markers.push(textmarker)
  }
  return markers
}

/**
 * Replace all occurances of a word in a set of textmarkers.
 * @param {Array<TextMarker>} textmarkers
 * @param {string} word
 */
export const replace_all = (textmarkers, word) => {
  textmarkers.forEach((marker) => {
    marker.replace_with(word)
  })
}

const next_marker = (state) => {
  if(state.textmarkers.length == 0){
    return { ...state, marker: null, previous: null }
  }

  if(!state.marker){
    return { ...state, marker: state.textmarkers[0] }
  }

  const marker_index = state.textmarkers.indexOf(state.marker)
  if(marker_index + 1 == state.textmarkers.length){
    return { ...state, marker: state.textmarkers[0], previous: state.textmarkers[marker_index] }
  }

  return { ...state, marker: state.textmarkers[marker_index + 1], previous: state.textmarkers[marker_index] }
}

const toggle_css = () => {
  document.body.querySelector("nav#at_the_top").classList.toggle("show_findreplace")
  document.body.querySelector("aside#findreplace_container").classList.toggle("show_findreplace")
}

const is_class_applied = () => {
  return document.body.querySelector("nav#at_the_top").classList.contains("show_findreplace")
}
