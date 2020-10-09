
export const next_marker = (state) => {
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

export const replace_all = (textmarkers, word) => {
  textmarkers.forEach((marker) => {
    marker.replace_with(word)
  })
}

export const clear_highlighting_all = (textmarkers) => {
  textmarkers.forEach((marker) => marker.clear_highlighting())
}

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

export const clear_all_markers = (cm) => cm.getAllMarks().forEach((mark) => mark.clear())

export const find_all_markers = (cm, word, cell_id) => {
  var markers = []
  var cursor = cm.getSearchCursor(word)
  while(cursor.findNext()){

    const highlighter = cm.markText(cursor.from(), cursor.to(), { css: "color: red; font-weight: bold" })
    const textmarker = infer_textmarker(cm, highlighter, cursor, cell_id)

    markers.push(textmarker)
  }
  return markers
}

const infer_textmarker = (cm, highlighter, cursor, cell_id) => {
  const from = cursor.from()
  const to = cursor.to()
  const textmarker = {
    select: () => {
      textmarker.marker = cm.markText(from, to, { css: "background: #D9D5D5; color: red; font-weight: bold" })
    },
    deselect: () => {
      textmarker.marker.clear()
    },
    replace_with: (word) => {
      cm.replaceRange(word, from, to)
    },
    clear_highlighting: () => {
      highlighter.clear()
    },
    cell_id: cell_id
  }
  return textmarker
}
