import { html, useState, useRef, useEffect } from "../imports/Preact.js"

const enter_key = 13

export const FindReplace = ({
  visible,
  cells,
  word,
  set_word,
  find_next,
  replace_with,
  replace_all
}) => {

  const [replace_value, set_replace_value] = useState(null)
  const input_find = useRef(null)

  const handle_find_value_change = (event) => {

    // Enter
    if(event.keyCode === enter_key){
      find_next()
    }
    else{
      set_word(event.target.value)
    }
  }

  const jump_to_find = () => {
    input_find.current.focus()

    // Not fixed yet: Must only be carried out upon either selecting a new word or opening the panel
    //input_find.current.select()
  }

  useEffect(() => {
    if(visible) jump_to_find()
  }, [visible])

  useEffect(() => jump_to_find(), [word])

  return html`
    <aside id="findreplace_container">
      <div id="findform">
        <input type="text" ref=${input_find} value=${word} onKeyUp=${handle_find_value_change}/>
        <button onClick=${find_next}>Next</button>
      </div>
      <div id="replaceform">
        <input type="text" value=${replace_value} onKeyUp=${(e) => {set_replace_value(event.target.value)}}/>
        <button onClick=${() => replace_with(replace_value)}>Replace</button>
        <button onClick=${() => replace_all(replace_value)}>All</button>
      </div>
  </aside>
  `
}
