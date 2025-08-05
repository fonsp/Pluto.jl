export function get_start_tabs(line: any): string;
/**
 * Plugin that makes line wrapping in the editor respect the identation of the line.
 * It does this by adding a line decoration that adds padding-left (as much as there is indentation),
 * and adds the same amount as negative "text-indent". The nice thing about text-indent is that it
 * applies to the initial line of a wrapped line.
 */
export const awesome_line_wrapping: StateField</*elided*/ any>;
import { StateField } from "../../imports/CodemirrorPlutoSetup.js";
