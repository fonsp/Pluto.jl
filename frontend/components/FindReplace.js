import { html, useState, useEffect, useLayoutEffect, useRef } from "../common/Preact.js"

export const FindReplace = ({
  cells,
  dispatch
}) => {

  const [find_value, set_find_value] = useState(null)
  const [replace_value, set_replace_value] = useState(null)

  const handle_find_value_change = (event) => {
    const word = event.target.value
    set_find_value(word)
    dispatch( { type: 'word', word: word } )
  }

  const select_next = () => {
    dispatch( { type: 'next' } )
  }

  const replace = () => {
    dispatch( { type: 'replace', replace_with: replace_value } )
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
