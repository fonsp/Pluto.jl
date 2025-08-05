/**
 * @type Facet<number?, number?>
 */
export const HighlightLineFacet: Facet<number | null, number | null>;
/**
 * @type Facet<{from: number, to: number}?, {from: number, to: number}?>
 */
export const HighlightRangeFacet: Facet<{
    from: number;
    to: number;
} | null, {
    from: number;
    to: number;
} | null>;
export function highlightLinePlugin(): ViewPlugin<{
    updateDecos(view: any): void;
    decorations: /*elided*/ any;
    /**
     * @param {ViewUpdate} update
     */
    update(update: ViewUpdate): void;
}>;
export function highlightRangePlugin(): ViewPlugin<{
    updateDecos(view: any): void;
    decorations: /*elided*/ any;
    /**
     * @param {ViewUpdate} update
     */
    update(update: ViewUpdate): void;
}>;
import { Facet } from "../../imports/CodemirrorPlutoSetup.js";
import { ViewUpdate } from "../../imports/CodemirrorPlutoSetup.js";
import { ViewPlugin } from "../../imports/CodemirrorPlutoSetup.js";
