import { html, useState, useEffect, useLayoutEffect, useRef } from "../common/Preact.js"

export const FindReplace = ({
  cells
}) => {

  const [find_value, set_find_value] = useState(null)
  const [replace_value, set_replace_value] = useState(null)
  const [cell_idx, set_cell_idx] = useState(0)

  const handle_find_value_change = (event) => {
    const word = event.target.value

    set_find_value(word)
    fire_select_same_words(word)
  }

  const select_at_idx = (current_cell_idx, replace_with = null) => {
    if (fire_select_same_words(find_value, cells[current_cell_idx].cell_id), replace_with) {

      if(current_cell_idx + 1 == cells.length){
        set_cell_idx(0)
        select_at_idx(0)
      }
      else{
        set_cell_idx(current_cell_idx + 1)
        select_at_idx(current_cell_idx + 1)
      }
    }
  }

  const select_next = () => {
    select_at_idx(cell_idx)
  }

  const replace = () => {
    select_at_idx(cell_idx, replace_value)
  }

  return html`
    <aside id="findreplace_container">
      <div id="findform">
        <input type="text" value=${find_value} onKeyUp=${handle_find_value_change}/>
        <button onClick=${select_next}>Next</button>
      </div>
      <div id="replaceform">
        <input type="text" value=${replace_value} onKeyUp=${(e) => {set_replace_value(event.target.value)}}/>
        <button onClick=${replace}>Replace</button>
        <button>All</button>
      </div>
  </aside>
  `
}

const fire_select_same_words = (word, selecting_cell = null, replace_with = null) => {
  const event = new CustomEvent("select_same_words", { detail: { word, selecting_cell, replace_with }, cancelable: true })
  return window.dispatchEvent(event)
}
