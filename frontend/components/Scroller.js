import { useEffect, useRef, useState } from "../imports/Preact.js"

/**
 * Utility component that scrolls the page automatically, when the pointer is
 * moved to the upper or lower 30%.
 *
 * Useful for things like selections and drag-and-drop.
 */
export const Scroller = ({ active }) => {
    const pointer = useRef()

    useEffect(() => {
        const handler = (e) => {
            pointer.current = { x: e.clientX, y: e.clientY }
        }
        document.addEventListener("pointermove", handler)
        document.addEventListener("dragover", handler)
        return () => {
            document.removeEventListener("pointermove", handler)
            document.removeEventListener("dragover", handler)
        }
    }, [])

    useEffect(() => {
        if (active.up || active.down) {
            let prev_time = null
            let current = true
            const scroll_update = (timestamp) => {
                if (current) {
                    if (prev_time == null) {
                        prev_time = timestamp
                    }
                    const dt = timestamp - prev_time
                    prev_time = timestamp

                    if (pointer.current) {
                        const y_ratio = pointer.current.y / window.innerHeight
                        if (active.up && y_ratio < 0.3) {
                            window.scrollBy(0, (((-1200 * (0.3 - y_ratio)) / 0.3) * dt) / 1000)
                        } else if (active.down && y_ratio > 0.7) {
                            window.scrollBy(0, (((1200 * (y_ratio - 0.7)) / 0.3) * dt) / 1000)
                        }
                    }

                    window.requestAnimationFrame(scroll_update)
                }
            }
            window.requestAnimationFrame(scroll_update)
            return () => (current = false)
        }
    }, [active.up, active.down])

    return null
}
