"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tab_help_plugin = exports.LastFocusWasForcedEffect = void 0;
const open_pluto_popup_js_1 = require("../../common/open_pluto_popup.js");
const CodemirrorPlutoSetup_js_1 = require("../../imports/CodemirrorPlutoSetup.js");
const lodash_js_1 = __importDefault(require("../../imports/lodash.js"));
const Preact_js_1 = require("../../imports/Preact.js");
/** @type {any} */
const TabHelpEffect = CodemirrorPlutoSetup_js_1.StateEffect.define();
const TabHelp = CodemirrorPlutoSetup_js_1.StateField.define({
    create() {
        return false;
    },
    update(value, tr) {
        for (let effect of tr.effects) {
            if (effect.is(TabHelpEffect))
                return effect.value;
        }
        return value;
    },
});
/** @type {any} */
exports.LastFocusWasForcedEffect = CodemirrorPlutoSetup_js_1.StateEffect.define();
const LastFocusWasForced = CodemirrorPlutoSetup_js_1.StateField.define({
    create() {
        return false;
    },
    update(value, tr) {
        for (let effect of tr.effects) {
            if (effect.is(exports.LastFocusWasForcedEffect))
                return effect.value;
        }
        return value;
    },
});
exports.tab_help_plugin = CodemirrorPlutoSetup_js_1.ViewPlugin.define((view) => ({
    setready: (x) => requestIdleCallback(() => {
        view.dispatch({
            effects: [TabHelpEffect.of(x)],
        });
    }),
}), {
    provide: (p) => [TabHelp, LastFocusWasForced],
    eventObservers: {
        focus: function (event, view) {
            // The next key should trigger the popup
            this.setready(true);
        },
        blur: function (event, view) {
            this.setready(false);
            requestIdleCallback(() => {
                view.dispatch({
                    effects: [exports.LastFocusWasForcedEffect.of(false)],
                });
            });
        },
        click: function (event, view) {
            // This means you are not doing keyboard navigation :)
            this.setready(false);
        },
        keydown: function (event, view) {
            if (event.key == "Tab") {
                if (view.state.field(TabHelp) && !view.state.field(LastFocusWasForced) && !view.state.readOnly) {
                    (0, open_pluto_popup_js_1.open_pluto_popup)({
                        type: "info",
                        source_element: view.dom,
                        body: (0, Preact_js_1.html) `Press <kbd>Esc</kbd> and then <kbd>Tab</kbd> to continue navigation. <em style="font-size: .6em;">skkrt!</em>`,
                    });
                    this.setready(false);
                }
            }
            else {
                this.setready(false);
            }
        },
    },
});
