import { useEventListener } from "../../common/useEventListener.js"
import { useEffect } from "../../imports/Preact.js"

/**
 * Time flies when you're building Pluto...
 * At one moment you self-assignee to issue number #1, next moment we're approaching issue #2000...
 *
 * We can't just put `<base target="_blank">` in the `<head>`, because this also opens hash links
 * like `#id` in a new tab...
 *
 * This components takes every click event on an <a> that points to another origin (i.e. not `#id`)
 * and sneakily puts in a `target="_blank"` attribute so it opens in a new tab.
 *
 * Fixes https://github.com/fonsp/Pluto.jl/issues/1
 * Based on https://stackoverflow.com/a/12552017/2681964
 */
export let HijackExternalLinksToOpenInNewTab = () => {
    useEventListener(
        document,
        "click",
        (event) => {
            if (event.defaultPrevented) return

            const origin = event.target.closest(`a`)

            if (origin && !origin.hasAttribute("target")) {
                let as_url = new URL(origin.href)
                if (as_url.origin !== window.location.origin) {
                    origin.target = "_blank"
                }
            }
        },
        []
    )

    return null
}
