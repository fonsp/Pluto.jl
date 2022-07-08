import { useEffect, useState } from "../imports/Preact.js"

/**
 * @typedef {(window: Window) => void} DesktopHookCallback
 */

/**
 * A hook to check whether pluto is running inside Desktop,
 * and execute a callback if that is the case.
 * @param {DesktopHookCallback | undefined} callback A function that takes in a window (having `plutoDesktop` as a property)
 * as its argument, if `plutoDesktop` is not found, it is not called. **DO NOT PASS ANY FUNCTION THAT CHANGES STATE OF THE COMPONENT.**
 * @returns A boolean denoting whether pluto is running inside Desktop or not and a condtional callback utility function.
 */
const usePlutoDesktop = (/** @type {DesktopHookCallback | undefined} */ callback) => {
    const [isDesktop, setIsDesktop] = useState(false)

    useEffect(() => {
        if (window.plutoDesktop) {
            // console.log(
            //   'Running in Desktop Environment! Found following properties/methods:',
            //   window.plutoDesktop
            // );
            setIsDesktop(true)
            if (callback) callback(window)
        }
        return () => {
            setIsDesktop(false)
        }
    }, [callback])

    /**
     * A simple utility function that calls a function if inside desktop
     * environment and optionally another if outside desktop environment.
     * @param {() => void} execute function called if in desktop environment
     * @param {(() => void) | undefined} [fallback] optional function called if not in desktop environment
     * @returns nothing
     */
    const conditionalCallback = (/** @type {() => void} */ execute, /** @type {(() => void) | undefined} */ fallback) => {
        if (isDesktop) {
            execute()
        } else if (fallback) fallback()
    }

    return { isDesktop, conditionalCallback }
}

export default usePlutoDesktop
