export const ENABLE_CM_MIXED_PARSER: boolean;
export const ENABLE_CM_SPELLCHECK: boolean;
export const ENABLE_CM_AUTOCOMPLETE_ON_TYPE: boolean;
export const pluto_syntax_colors_julia: HighlightStyle;
export const pluto_syntax_colors_javascript: HighlightStyle;
export const pluto_syntax_colors_python: HighlightStyle;
export const pluto_syntax_colors_css: HighlightStyle;
export const pluto_syntax_colors_html: HighlightStyle;
export const pluto_syntax_colors_markdown: HighlightStyle;
export const LastRemoteCodeSetTimeFacet: Facet<any, any>;
export function CellInput({ local_code, remote_code, disable_input, focus_after_creation, cm_forced_focus, set_cm_forced_focus, show_input, skip_static_fake, on_submit, on_delete, on_add_after, on_change, on_update_doc_query, on_focus_neighbor, on_line_heights, nbpkg, cell_id, notebook_id, any_logs, show_logs, set_show_logs, set_cell_disabled, cm_highlighted_line, cm_highlighted_range, metadata, global_definition_locations, cm_diagnostics, }: {
    local_code: string;
    remote_code: string;
    scroll_into_view_after_creation: boolean;
    nbpkg: import("./Editor.js").NotebookPkgData | null;
    global_definition_locations: {
        [variable_name: string]: string;
    };
    [key: string]: any;
}): import("../imports/Preact.js").ReactElement;
import { HighlightStyle } from "../imports/CodemirrorPlutoSetup.js";
import { Facet } from "../imports/CodemirrorPlutoSetup.js";
