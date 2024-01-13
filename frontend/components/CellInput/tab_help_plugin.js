import { open_pluto_popup } from "../../common/open_pluto_popup.js"
import { ViewPlugin, StateEffect, StateField } from "../../imports/CodemirrorPlutoSetup.js"
import _ from "../../imports/lodash.js"
import { html } from "../../imports/Preact.js"

/** @type {any} */
const TabHelpEffect = StateEffect.define()
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

/** @type {any} */
export const LastFocusWasForcedEffect = StateEffect.define()
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

export const tab_help_plugin = ViewPlugin.define(
    (view) => ({
        setready: (x) =>
            requestIdleCallback(() => {
                view.dispatch({
                    effects: [TabHelpEffect.of(x)],
                })
            }),
    }),
    {
        provide: (p) => [TabHelp, LastFocusWasForced],
        eventObservers: {
            focus: function (event, view) {
                // The next key should trigger the popup
                this.setready(true)
            },
            blur: function (event, view) {
                this.setready(false)
                requestIdleCallback(() => {
                    view.dispatch({
                        effects: [LastFocusWasForcedEffect.of(false)],
                    })
                })
            },
            click: function (event, view) {
                // This means you are not doing keyboard navigation :)
                this.setready(false)
            },
            keydown: function (event, view) {
                if (event.key == "Tab") {
                    if (view.state.field(TabHelp) && !view.state.field(LastFocusWasForced) && !view.state.readOnly) {
                        open_pluto_popup({
                            type: "info",
                            source_element: view.dom,
                            body: html`Press <kbd>Esc</kbd> and then <kbd>Tab</kbd> to continue navigation. <em style="font-size: .6em;">skkrt!</em>`,
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
