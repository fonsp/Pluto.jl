import { html, useState, useEffect, useLayoutEffect, useRef } from "../common/Preact.js"

export const FindReplace = () => {

  return html`
    <popin>
    <div id="info2">
      <form id="feedback2">
          <input type="text" name="opinion2" id="opinion2" autocomplete="off" placeholder="..." />
          <button>Find</button>
          <button>Find All</button>
      </form>
      <form id="feedback3">
          <input type="text" name="opinion3" id="opinion3" autocomplete="off" placeholder="..." />
          <button>Replace</button>
          <button>Replace All</button>
      </form>
    </div>
    </popin>
  `

}
