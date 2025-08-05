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
export function iterate_with_cursor({ tree, enter, leave, from, to }: {
    tree: any;
    enter: (cursor: import("../../imports/CodemirrorPlutoSetup.js").TreeCursor) => (void | boolean);
    leave?: (cursor: import("../../imports/CodemirrorPlutoSetup.js").TreeCursor) => (void | boolean);
    from?: number;
    to?: number;
}): void;
