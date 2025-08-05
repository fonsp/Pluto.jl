/**
 * Key: variable name, value: cell id.
 * @type {Facet<{ [variable_name: string]: string }, { [variable_name: string]: string }>}
 */
export const GlobalDefinitionsFacet: Facet<{
    [variable_name: string]: string;
}, {
    [variable_name: string]: string;
}>;
export const go_to_definition_plugin: ViewPlugin<{
    decorations: /*elided*/ any;
    update(update: any): void;
}>;
import { Facet } from "../../imports/CodemirrorPlutoSetup.js";
import { ViewPlugin } from "../../imports/CodemirrorPlutoSetup.js";
