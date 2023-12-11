import { Facet, ViewPlugin, Decoration, EditorView, StateEffect, StateField, ViewUpdate } from "../../imports/CodemirrorPlutoSetup.js"
import { ctrl_or_cmd_name, has_ctrl_or_cmd_pressed } from "../../common/KeyboardShortcuts.js"
import _ from "../../imports/lodash.js"
import { ScopeStateField } from "./scopestate_statefield.js"
import { open_pluto_popup } from "../Popup.js"
import { html } from "../../imports/Preact.js"

/** @type {any} */
const TabHelpEffect = StateEffect.define()
/** @type {any} */
export const LastFocusWasForcedEffect = StateEffect.define()
const TabHelp = StateField.define({
    create() {
        return false
    },
    update(value, tr) {
        for (let effect of tr.effects) {
            if (effect.is(TabHelpEffect)) return effect.value
        }
        return value
    },
})
const LastFocusWasForced = StateField.define({
    create() {
        return false
    },
    update(value, tr) {
        for (let effect of tr.effects) {
            if (effect.is(LastFocusWasForcedEffect)) return effect.value
        }
        return value
    },
})

export const tab_help_plugin = ViewPlugin.fromClass(
    class {
        /**
         * @param {EditorView} view
         */
        constructor(view) {
            // let global_definitions = view.state.facet(GlobalDefinitionsFacet)
            this.setready = (x) =>
                view.dispatch({
                    effects: [TabHelpEffect.of(x)],
                })
        }

        /**
         * @param {ViewUpdate} update
         */
        update(update) {
            const selection_changed = update.startState.selection.eq(update.state.selection)
            const doc_changed = update.docChanged

            console.log("ff", update.view.state.field(LastFocusWasForced))
            console.log({ selection_changed, doc_changed }, update)
        }
    },
    {
        provide: (p) => [TabHelp, LastFocusWasForced],
        eventObservers: {
            focus: function (event, view) {
                // The next key should trigger the popup
                this.setready(true)
                console.warn("focus", event, view)
            },
            blur: function (event, view) {
                this.setready(false)
                view.dispatch({
                    effects: [LastFocusWasForcedEffect.of(false)],
                })
                console.warn("blur", event, view)
            },
            click: function (event, view) {
                // This means you are not doing keyboard navigation :)
                this.setready(false)
                console.warn("click", event, view)
            },
            keydown: function (event, view) {
                console.warn("keydown", event, view)
                if (event.key == "Tab") {
                    if (view.state.field(TabHelp) && !view.state.field(LastFocusWasForced) && !view.state.readOnly) {
                        open_pluto_popup({
                            type: "info",
                            source_element: view.dom,
                            body: html`Press <kbd>Esc</kbd> and then <kbd>Tab</kbd> to continue navigation.`,
                        })
                        this.setready(false)
                    }
                } else {
                    this.setready(false)
                }
            },
        },
    }
)
