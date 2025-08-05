"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiSuggestionPlugin = exports.start_ai_suggestion = void 0;
const CodemirrorPlutoSetup_js_1 = require("../../imports/CodemirrorPlutoSetup.js");
const CellInput_js_1 = require("../CellInput.js");
/**
 * Suggest AI-generated code as the new input of a cell.
 * @param {HTMLElement?} start_node Any node that is a child of a cell. AI suggestion will happen in the parent cell.
 * @param {{code: string, reject?: boolean}} detail `reject` means reject the AI suggestion.
 * @returns {Promise<void>}
 */
const start_ai_suggestion = (start_node, detail) => new Promise(async (resolve, reject) => {
    const get_cm = () => start_node?.closest("pluto-cell")?.querySelector("pluto-input > .cm-editor .cm-content");
    const cm = get_cm();
    if (cm) {
        const get_live_cm = () => {
            const cm = get_cm();
            if (cm?.hasAttribute("data-currently-live")) {
                return cm;
            }
            return null;
        };
        let live_cm = get_live_cm();
        if (!live_cm) {
            cm.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        }
        while (!live_cm) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            live_cm = get_live_cm();
        }
        live_cm.dispatchEvent(new CustomEvent("ai-suggestion", { detail }));
        resolve();
    }
    else {
        reject(new Error("Could not find an editor that belongs to this element"));
    }
});
exports.start_ai_suggestion = start_ai_suggestion;
const AiSuggestionPlugin = () => {
    const compartment = new CodemirrorPlutoSetup_js_1.Compartment();
    const start_ai_suggestion = (/** @type {EditorView} */ view, suggested_code) => {
        const state = view.state;
        return view.dispatch({
            effects: [
                AISuggestionTimeEffect.of(Date.now()),
                compartment.reconfigure([
                    //
                    CodemirrorPlutoSetup_js_1.merge.unifiedMergeView({
                        original: state.doc,
                        gutter: false,
                        allowInlineDiffs: true || suggested_code.split("\n").length === 1,
                    }),
                    AllAccepted,
                    DisableMergeWhenAllAccepted(compartment),
                    DontDiffNewChanges,
                    DontDiffNewChangesInverter,
                ]),
            ],
            changes: {
                from: 0,
                to: state.doc.length,
                insert: suggested_code,
            },
        });
    };
    const disabled_extension = [];
    const reject_ai_suggestion = (/** @type {EditorView} */ view) => {
        const state = view.state;
        // @ts-ignore
        const is_active = compartment.get(state)?.length !== disabled_extension.length;
        if (!is_active)
            return;
        const { chunks } = CodemirrorPlutoSetup_js_1.merge.getChunks(state) ?? {};
        if (!chunks)
            return;
        if (chunks.length === 0)
            return;
        const original_doc = CodemirrorPlutoSetup_js_1.merge.getOriginalDoc(state);
        view.dispatch({
            changes: chunks.map((chunk) => ({
                from: chunk.fromB,
                to: Math.min(state.doc.length, chunk.toB),
                insert: original_doc.slice(chunk.fromA, chunk.toA),
            })),
            effects: [compartment.reconfigure([])],
        });
    };
    const ai_event_listener = CodemirrorPlutoSetup_js_1.EditorView.domEventHandlers({
        "ai-suggestion": (event, view) => {
            const { code, reject, on_ } = event.detail;
            if (reject) {
                reject_ai_suggestion(view);
            }
            else {
                start_ai_suggestion(view, code);
            }
            return true;
        },
    });
    return [AISuggestionTime, ai_event_listener, hello_im_available, compartment.of(disabled_extension)];
};
exports.AiSuggestionPlugin = AiSuggestionPlugin;
const hello_im_available = CodemirrorPlutoSetup_js_1.ViewPlugin.define((view) => {
    view.contentDOM.setAttribute("data-currently-live", "true");
    return {};
});
const AllAccepted = CodemirrorPlutoSetup_js_1.StateField.define({
    create: () => false,
    update: (all_accepted, tr) => {
        if (!tr.docChanged)
            all_accepted;
        return CodemirrorPlutoSetup_js_1.merge.getOriginalDoc(tr.state).eq(tr.newDoc);
    },
});
/**
 * @type {any}
 */
const AISuggestionTimeEffect = CodemirrorPlutoSetup_js_1.StateEffect.define();
const AISuggestionTime = CodemirrorPlutoSetup_js_1.StateField.define({
    create: () => 0,
    update(value, tr) {
        for (let effect of tr.effects) {
            if (effect.is(AISuggestionTimeEffect))
                return effect.value;
        }
        return value;
    },
});
const DisableMergeWhenAllAccepted = (/** @type {Compartment} */ compartment) => CodemirrorPlutoSetup_js_1.EditorState.transactionExtender.of((tr) => {
    const code_was_submitted_after_ai_suggestion = tr.startState.field(AISuggestionTime) < tr.startState.facet(CellInput_js_1.LastRemoteCodeSetTimeFacet);
    if (code_was_submitted_after_ai_suggestion || tr.startState.field(AllAccepted)) {
        console.log("auto-disabling merge");
        return {
            effects: [compartment.reconfigure([])],
        };
    }
    return null;
});
const EditWasMadeByDontDiffNewChanges = CodemirrorPlutoSetup_js_1.Annotation.define();
/**
 * An extension to add to the unified merge view. With this extension, when you make edits that are outside one of the existing chunks, no new chunk will be created.
 */
const DontDiffNewChanges = CodemirrorPlutoSetup_js_1.EditorState.transactionExtender.of((tr) => {
    if (!tr.docChanged)
        return null;
    if (!tr.isUserEvent)
        return null;
    const original_doc = CodemirrorPlutoSetup_js_1.merge.getOriginalDoc(tr.startState);
    const gc = CodemirrorPlutoSetup_js_1.merge.getChunks(tr.startState);
    if (!gc)
        return null;
    const { chunks } = gc;
    if (chunks.length === 0)
        return null;
    // Go from a position in the editable doc to the position in the original doc.
    const map_pos_to_original = (pos) => {
        let out = pos;
        for (const chunk of chunks) {
            if (chunk.fromB <= pos) {
                out = Math.max(chunk.fromA, pos + chunk.toA - chunk.toB);
            }
        }
        return out;
    };
    const changes = [];
    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        for (let chunk of chunks) {
            // If the change is completely contained in a chunk, don't modify the original – just let the user edit the chunk.
            if (chunk.fromB <= fromA && toA <= chunk.toB && fromA < chunk.toB)
                return;
        }
        // Otherwise, this is the matching change in the original doc.
        changes.push({
            from: map_pos_to_original(fromA),
            to: map_pos_to_original(toA),
            insert: inserted,
        });
    });
    if (changes.length === 0)
        return null;
    const changes_mapped_to_original_doc = CodemirrorPlutoSetup_js_1.EditorState.create({ doc: original_doc }).changes(changes);
    return {
        effects: CodemirrorPlutoSetup_js_1.merge.originalDocChangeEffect(tr.startState, changes_mapped_to_original_doc),
        annotations: EditWasMadeByDontDiffNewChanges.of(changes_mapped_to_original_doc.invert(original_doc)),
    };
});
/** Ensure that the effects from DontDiffNewChanges are undone when you Ctrl+Z. */
const DontDiffNewChangesInverter = CodemirrorPlutoSetup_js_1.invertedEffects.of((tr) => {
    const an = tr.annotation(EditWasMadeByDontDiffNewChanges);
    return an ? [CodemirrorPlutoSetup_js_1.merge.originalDocChangeEffect(tr.state, an)] : [];
});
