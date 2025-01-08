/**
 * Like Lezers `iterate`, but instead of `{ from, to, getNode() }`
 * this will give `enter()` and `leave()` the `cursor` (which can be effeciently matches with lezer template)
 *
 * @param {{
 *  tree: any,
 *  enter: (cursor: import("../../imports/CodemirrorPlutoSetup.js").TreeCursor) => (void | boolean),
 *  leave?: (cursor: import("../../imports/CodemirrorPlutoSetup.js").TreeCursor) => (void | boolean),
 *  from?: number,
 *  to?: number,
 * }} options
 */
export function iterate_with_cursor({ tree, enter, leave, from = 0, to = tree.length }) {
    let cursor = tree.cursor()
    while (true) {
        let mustLeave = false
        if (cursor.from <= to && cursor.to >= from && (cursor.type.isAnonymous || enter(cursor) !== false)) {
            if (cursor.firstChild()) continue
            if (!cursor.type.isAnonymous) mustLeave = true
        }
        while (true) {
            if (mustLeave && leave) leave(cursor)
            mustLeave = cursor.type.isAnonymous
            if (cursor.nextSibling()) break
            if (!cursor.parent()) return
            mustLeave = true
        }
    }
}
