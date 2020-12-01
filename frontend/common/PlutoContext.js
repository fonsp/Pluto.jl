import { createContext } from "../imports/Preact.js"

export let PlutoContext = createContext()
export let PlutoBondsContext = createContext(/** @type {{ [key: string]: { value: any } }} */ (null))
