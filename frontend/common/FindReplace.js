
export const next_marker = (state) => {
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
