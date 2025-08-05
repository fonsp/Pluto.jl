/**
 * @typedef PkgstatusmarkWidgetProps
 * @type {{ nbpkg: import("../Editor.js").NotebookPkgData, pluto_actions: any, notebook_id: string }}
 */
export const pkg_disablers: string[];
/**
 * @type {Facet<import("../Editor.js").NotebookPkgData?, import("../Editor.js").NotebookPkgData?>}
 */
export const NotebookpackagesFacet: Facet<import("../Editor.js").NotebookPkgData | null, import("../Editor.js").NotebookPkgData | null>;
export function pkgBubblePlugin({ pluto_actions, notebook_id_ref }: {
    pluto_actions: any;
    notebook_id_ref: any;
}): ViewPlugin<{
    update_decos(view: any): void;
    decorations: /*elided*/ any;
    /**
     * @param {ViewUpdate} update
     */
    update(update: ViewUpdate): void;
}>;
export type PkgstatusmarkWidgetProps = {
    nbpkg: import("../Editor.js").NotebookPkgData;
    pluto_actions: any;
    notebook_id: string;
};
import { Facet } from "../../imports/CodemirrorPlutoSetup.js";
import { ViewUpdate } from "../../imports/CodemirrorPlutoSetup.js";
import { ViewPlugin } from "../../imports/CodemirrorPlutoSetup.js";
