"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscreteProgressBarTest = exports.DiscreteProgressBar = void 0;
const ClassTable_js_1 = require("../common/ClassTable.js");
const Preact_js_1 = require("../imports/Preact.js");
const DiscreteProgressBar = ({ onClick, total, done, busy, failed_indices }) => {
    total = Math.max(1, total);
    return (0, Preact_js_1.html) `
        <div
            class=${(0, ClassTable_js_1.cl)({
        "discrete-progress-bar": true,
        "small": total < 8,
        "mid": total >= 8 && total < 48,
        "big": total >= 48,
    })}
            data-total=${total}
            onClick=${onClick}
        >
            ${[...Array(total)].map((_, i) => {
        return (0, Preact_js_1.html) `<div
                    class=${(0, ClassTable_js_1.cl)({
            done: i < done,
            failed: failed_indices.includes(i),
            busy: i >= done && i < done + busy,
        })}
                ></div>`;
    })}
        </div>
    `;
};
exports.DiscreteProgressBar = DiscreteProgressBar;
const DiscreteProgressBarTest = () => {
    const [done_total, set_done_total] = (0, Preact_js_1.useState)([0, 0, 0]);
    const done_total_ref = (0, Preact_js_1.useRef)(done_total);
    done_total_ref.current = done_total;
    (0, Preact_js_1.useEffect)(() => {
        let handle = setInterval(() => {
            const [done, busy, total] = done_total_ref.current;
            if (Math.random() < 0.3) {
                if (done < total) {
                    if (Math.random() < 0.1) {
                        set_done_total([done, 1, total + 5]);
                    }
                    else {
                        set_done_total([done + 1, 1, total]);
                    }
                }
                else {
                    set_done_total([0, 1, Math.ceil(Math.random() * Math.random() * 100)]);
                }
            }
        }, 100);
        return () => clearInterval(handle);
    }, []);
    return (0, Preact_js_1.html) `<${exports.DiscreteProgressBar} total=${done_total[2]} busy=${done_total[1]} done=${done_total[0]} />`;
};
exports.DiscreteProgressBarTest = DiscreteProgressBarTest;
