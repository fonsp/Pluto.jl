"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDebouncedTruth = exports.useMillisSinceTruthy = exports.prettytime = exports.RunArea = void 0;
const lodash_js_1 = __importDefault(require("../imports/lodash.js"));
const Preact_js_1 = require("../imports/Preact.js");
const KeyboardShortcuts_js_1 = require("../common/KeyboardShortcuts.js");
const PlutoContext_js_1 = require("../common/PlutoContext.js");
const open_pluto_popup_js_1 = require("../common/open_pluto_popup.js");
const RunArea = ({ runtime, running, queued, code_differs, on_run, on_interrupt, set_cell_disabled, depends_on_disabled_cells, running_disabled, on_jump, }) => {
    const on_save = on_run; /* because disabled cells save without running */
    const local_time_running_ms = (0, exports.useMillisSinceTruthy)(running);
    const local_time_running_ns = local_time_running_ms == null ? null : 1e6 * local_time_running_ms;
    const pluto_actions = (0, Preact_js_1.useContext)(PlutoContext_js_1.PlutoActionsContext);
    const action = running || queued ? "interrupt" : running_disabled ? "save" : depends_on_disabled_cells && !code_differs ? "jump" : "run";
    const fmap = {
        on_interrupt,
        on_save,
        on_jump,
        on_run,
    };
    const titlemap = {
        interrupt: "Interrupt (Ctrl + Q)",
        save: "Save code without running",
        jump: "This cell depends on a disabled cell",
        run: "Run cell (Shift + Enter)",
    };
    const on_double_click = (/** @type {MouseEvent} */ e) => {
        console.log(running_disabled);
        if (running_disabled)
            (0, open_pluto_popup_js_1.open_pluto_popup)({
                type: "info",
                source_element: /** @type {HTMLElement?} */ (e.target),
                body: (0, Preact_js_1.html) `${`This cell is disabled. `}
                    <a
                        href="#"
                        onClick=${(e) => {
                    //@ts-ignore
                    set_cell_disabled(false);
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent("close pluto popup"));
                }}
                        >Enable this cell</a
                    >
                    ${` to run the code.`}`,
            });
    };
    return (0, Preact_js_1.html) `
        <pluto-runarea class=${action}>
            <button onDblClick=${on_double_click} onClick=${fmap[`on_${action}`]} class="runcell" title=${titlemap[action]}>
                <span></span>
            </button>
            <span class="runtime">${(0, exports.prettytime)(running ? local_time_running_ns ?? runtime : runtime)}</span>
        </pluto-runarea>
    `;
};
exports.RunArea = RunArea;
const prettytime = (time_ns) => {
    if (time_ns == null) {
        return "---";
    }
    let result = time_ns;
    const prefices = ["n", "μ", "m", ""];
    let i = 0;
    while (i < prefices.length - 1 && result >= 1000.0) {
        i += 1;
        result /= 1000;
    }
    const roundedtime = result.toFixed(time_ns < 100 || result >= 100.0 ? 0 : 1);
    return roundedtime + "\xa0" + prefices[i] + "s";
};
exports.prettytime = prettytime;
const update_interval = 50;
/**
 * Returns the milliseconds passed since the argument became truthy.
 * If argument is falsy, returns undefined.
 *
 * @param {boolean} truthy
 */
const useMillisSinceTruthy = (truthy) => {
    const [now, setNow] = (0, Preact_js_1.useState)(0);
    const [startRunning, setStartRunning] = (0, Preact_js_1.useState)(0);
    (0, Preact_js_1.useEffect)(() => {
        let interval;
        if (truthy) {
            const now = +new Date();
            setStartRunning(now);
            setNow(now);
            interval = setInterval(() => setNow(+new Date()), update_interval);
        }
        return () => {
            interval && clearInterval(interval);
        };
    }, [truthy]);
    return truthy ? now - startRunning : undefined;
};
exports.useMillisSinceTruthy = useMillisSinceTruthy;
const useDebouncedTruth = (truthy, delay = 5) => {
    const [mytruth, setMyTruth] = (0, Preact_js_1.useState)(truthy);
    const setMyTruthAfterNSeconds = (0, Preact_js_1.useMemo)(() => lodash_js_1.default.debounce(setMyTruth, delay * 1000), [setMyTruth]);
    (0, Preact_js_1.useEffect)(() => {
        if (truthy) {
            setMyTruth(true);
            setMyTruthAfterNSeconds.cancel();
        }
        else {
            setMyTruthAfterNSeconds(false);
        }
        return () => { };
    }, [truthy]);
    return mytruth;
};
exports.useDebouncedTruth = useDebouncedTruth;
