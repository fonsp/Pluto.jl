"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logs = void 0;
const lodash_js_1 = __importDefault(require("../imports/lodash.js"));
const ClassTable_js_1 = require("../common/ClassTable.js");
const Preact_js_1 = require("../imports/Preact.js");
const TreeView_js_1 = require("./TreeView.js");
const Popup_js_1 = require("./Popup.js");
const AnsiUp_js_1 = require("../imports/AnsiUp.js");
const open_pluto_popup_js_1 = require("../common/open_pluto_popup.js");
const LOGS_VISIBLE_START = 60;
const LOGS_VISIBLE_END = 20;
const PROGRESS_LOG_LEVEL = "LogLevel(-1)";
const STDOUT_LOG_LEVEL = "LogLevel(-555)";
// const RESIZE_THROTTLE = 60
const is_progress_log = (log) => {
    return log.level == PROGRESS_LOG_LEVEL && log.kwargs.find((kwarg) => kwarg[0] === "progress") !== undefined;
};
const is_stdout_log = (log) => {
    return log.level == STDOUT_LOG_LEVEL;
};
const Logs = ({ logs, line_heights, set_cm_highlighted_line, sanitize_html }) => {
    const progress_logs = logs.filter(is_progress_log);
    const latest_progress_logs = progress_logs.reduce((progress_logs, log) => ({ ...progress_logs, [log.id]: log }), {});
    const stdout_log = logs.reduce((stdout_log, log) => {
        if (!is_stdout_log(log)) {
            return stdout_log;
        }
        if (stdout_log === null) {
            return log;
        }
        return {
            ...stdout_log,
            msg: [stdout_log.msg[0] + log.msg[0]], // Append to the previous stdout
        };
    }, null);
    const [_, __, grouped_progress_and_logs] = logs.reduce(([seen_progress, seen_stdout, final_logs], log) => {
        const ipl = is_progress_log(log);
        if (ipl && !seen_progress.has(log.id)) {
            seen_progress.add(log.id);
            return [seen_progress, seen_stdout, [...final_logs, latest_progress_logs[log.id]]];
        }
        else if (!ipl) {
            if (is_stdout_log(log) && !seen_stdout) {
                return [seen_progress, true, [...final_logs, stdout_log]];
            }
            else if (!is_stdout_log(log)) {
                return [seen_progress, seen_stdout, [...final_logs, log]];
            }
        }
        return [seen_progress, seen_stdout, final_logs];
    }, [new Set(), false, []]);
    const is_hidden_input = line_heights[0] === 0;
    if (logs.length === 0) {
        return null;
    }
    const dot = (log, i) => (0, Preact_js_1.html) `<${Dot}
        set_cm_highlighted_line=${set_cm_highlighted_line}
        level=${log.level}
        msg=${log.msg}
        kwargs=${log.kwargs}
        sanitize_html=${sanitize_html}
        key=${i}
        y=${is_hidden_input ? 0 : log.line - 1}
    /> `;
    return (0, Preact_js_1.html) `
        <pluto-logs-container>
            <pluto-logs>
                ${grouped_progress_and_logs.length <= LOGS_VISIBLE_END + LOGS_VISIBLE_START
        ? grouped_progress_and_logs.map(dot)
        : [
            ...grouped_progress_and_logs.slice(0, LOGS_VISIBLE_START).map(dot),
            (0, Preact_js_1.html) `<pluto-log-truncated>
                              ${grouped_progress_and_logs.length - LOGS_VISIBLE_START - LOGS_VISIBLE_END} logs not shown...
                          </pluto-log-truncated>`,
            ...grouped_progress_and_logs
                .slice(-LOGS_VISIBLE_END)
                .map((log, i) => dot(log, i + grouped_progress_and_logs.length - LOGS_VISIBLE_END)),
        ]}
            </pluto-logs>
        </pluto-logs-container>
    `;
};
exports.Logs = Logs;
const Progress = ({ name, progress }) => {
    return (0, Preact_js_1.html) `<pluto-progress-name>${name}</pluto-progress-name>
        <pluto-progress-bar-container><${ProgressBar} progress=${progress} /></pluto-progress-bar-container>`;
};
const ProgressBar = ({ progress }) => {
    const bar_ref = (0, Preact_js_1.useRef)(/** @type {HTMLElement?} */ (null));
    (0, Preact_js_1.useLayoutEffect)(() => {
        if (!bar_ref.current)
            return;
        bar_ref.current.style.backgroundSize = `${progress * 100}% 100%`;
    }, [bar_ref.current, progress]);
    return (0, Preact_js_1.html) `<pluto-progress-bar ref=${bar_ref}>${Math.ceil(100 * progress)}%</pluto-progress-bar>`;
};
const Dot = ({ set_cm_highlighted_line, msg, kwargs, y, level, sanitize_html }) => {
    const is_progress = is_progress_log({ level, kwargs });
    const is_stdout = level === STDOUT_LOG_LEVEL;
    let progress = null;
    if (is_progress) {
        progress = kwargs.find((p) => p[0] === "progress")[1][0];
        if (progress === "nothing") {
            progress = 0;
        }
        else if (progress === '"done"') {
            progress = 1;
        }
        else {
            progress = parseFloat(progress);
        }
        level = "Progress";
    }
    if (is_stdout) {
        level = "Stdout";
    }
    const mimepair_output = (pair) => (0, Preact_js_1.html) `<${TreeView_js_1.SimpleOutputBody} cell_id=${"cell_id_not_known"} mime=${pair[1]} body=${pair[0]} persist_js_state=${false} sanitize_html=${sanitize_html} />`;
    (0, Preact_js_1.useEffect)(() => {
        return () => set_cm_highlighted_line(null);
    }, []);
    return (0, Preact_js_1.html) `<pluto-log-dot-positioner
        class=${(0, ClassTable_js_1.cl)({ [level]: true })}
        onMouseenter=${() => is_progress || set_cm_highlighted_line(y + 1)}
        onMouseleave=${() => {
        set_cm_highlighted_line(null);
    }}
    >
        <pluto-log-icon></pluto-log-icon>
        <pluto-log-dot class=${level}
            >${is_progress
        ? (0, Preact_js_1.html) `<${Progress} name="${msg[0]}" progress=${progress} />`
        : is_stdout
            ? (0, Preact_js_1.html) `<${MoreInfo}
                          body=${(0, Preact_js_1.html) `${"This text was written to the "}
                              <a href="https://en.wikipedia.org/wiki/Standard_streams" target="_blank">terminal stream</a>${" while running the cell. "}<span
                                  style="opacity: .5"
                                  >${"(It is not the "}<em>return value</em>${" of the cell.)"}</span
                              >`}
                      />
                      <${LogViewAnsiUp} value=${msg[0]} />`
            : (0, Preact_js_1.html) `${mimepair_output(msg)}${kwargs.map(([k, v]) => (0, Preact_js_1.html) `<pluto-log-dot-kwarg><pluto-key>${k}</pluto-key><pluto-value>${mimepair_output(v)}</pluto-value></pluto-log-dot-kwarg>`)}`}</pluto-log-dot
        >
    </pluto-log-dot-positioner>`;
};
const MoreInfo = (/** @type{{body: import("../imports/Preact.js").ReactElement}} */ { body }) => {
    return (0, Preact_js_1.html) `<a
        class="stdout-info"
        target="_blank"
        title="Click for more info"
        href="#"
        onClick=${(/** @type{Event} */ e) => {
        (0, open_pluto_popup_js_1.open_pluto_popup)({
            type: "info",
            source_element: /** @type {HTMLElement?} */ (e.currentTarget),
            body,
        });
        e.preventDefault();
    }}
        ><img alt="❔" src=${Popup_js_1.help_circle_icon}
    /></a>`;
};
const LogViewAnsiUp = (/** @type {{value: string}} */ { value }) => {
    const node_ref = (0, Preact_js_1.useRef)(/** @type {HTMLElement?} */ (null));
    (0, Preact_js_1.useEffect)(() => {
        if (!node_ref.current)
            return;
        node_ref.current.innerHTML = (0, AnsiUp_js_1.ansi_to_html)(value);
    }, [node_ref.current, value]);
    return (0, Preact_js_1.html) `<pre ref=${node_ref}></pre>`;
};
