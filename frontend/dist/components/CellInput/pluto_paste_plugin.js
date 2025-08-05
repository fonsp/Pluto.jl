"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pluto_paste_plugin = void 0;
const Serialization_js_1 = require("../../common/Serialization.js");
const CodemirrorPlutoSetup_js_1 = require("../../imports/CodemirrorPlutoSetup.js");
let pluto_paste_plugin = ({ pluto_actions, cell_id }) => {
    return CodemirrorPlutoSetup_js_1.EditorView.domEventHandlers({
        paste: (event, view) => {
            if (!view.hasFocus) {
                // Tell codemirror it doesn't have to handle this when it doesn't have focus
                console.log("CodeMirror, why are you registring this paste? You aren't focused!");
                return true;
            }
            // Prevent this event from reaching the Editor-level paste handler
            event.stopPropagation();
            const topaste = event.clipboardData.getData("text/plain");
            const deserializer = (0, Serialization_js_1.detect_deserializer)(topaste);
            if (deserializer == null) {
                return false;
            }
            // If we have the whole cell selected, the user doesn't want their current code to survive...
            // So we paste the cells, but then remove the original cell! (Ideally I want to keep that cell and fill it with the first deserialized one)
            // (This also applies to pasting in an empty cell)
            if (view.state.selection.main.from === 0 && view.state.selection.main.to === view.state.doc.length) {
                pluto_actions.add_deserialized_cells(topaste, cell_id, deserializer);
                pluto_actions.confirm_delete_multiple("This Should Never Be Visible", [cell_id]);
                return true;
            }
            // End of cell, add new cells below
            if (view.state.selection.main.to === view.state.doc.length) {
                pluto_actions.add_deserialized_cells(topaste, cell_id, deserializer);
                return true;
            }
            // Start of cell, ideally we'd add new cells above, but we don't have that yet
            if (view.state.selection.main.from === 0) {
                pluto_actions.add_deserialized_cells(topaste, cell_id, deserializer);
                return true;
            }
            return false;
        },
    });
};
exports.pluto_paste_plugin = pluto_paste_plugin;
