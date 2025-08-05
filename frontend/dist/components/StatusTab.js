"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStatusItem = exports.path_to_first_busy_business = exports.total_tasks = exports.total_done = exports.is_busy = exports.is_started = exports.is_finished = exports.friendly_name = exports.StatusTab = void 0;
const Preact_js_1 = require("../imports/Preact.js");
const ClassTable_js_1 = require("../common/ClassTable.js");
const RunArea_js_1 = require("./RunArea.js");
const DiscreteProgressBar_js_1 = require("./DiscreteProgressBar.js");
const PkgTerminalView_js_1 = require("./PkgTerminalView.js");
const NotifyWhenDone_js_1 = require("./NotifyWhenDone.js");
const ProgressBar_js_1 = require("./ProgressBar.js");
/**
 * @param {{
 * status: import("./Editor.js").StatusEntryData,
 * notebook: import("./Editor.js").NotebookData,
 * backend_launch_logs: string?,
 * my_clock_is_ahead_by: number,
 * }} props
 */
const StatusTab = ({ status, notebook, backend_launch_logs, my_clock_is_ahead_by }) => {
    return (0, Preact_js_1.html) `
        <section>
            <${StatusItem}
                status_tree=${status}
                path=${[]}
                my_clock_is_ahead_by=${my_clock_is_ahead_by}
                nbpkg=${notebook.nbpkg}
                backend_launch_logs=${backend_launch_logs}
            />
            <${NotifyWhenDone_js_1.NotifyWhenDone} status=${status} />
        </section>
    `;
};
exports.StatusTab = StatusTab;
/**
 * Status items are sorted in the same order as they appear in list. Unspecified items are sorted to the end.
 */
const global_order = `
workspace

create_process
init_process


pkg

analysis
waiting_for_others
resolve
remove
add
instantiate
instantiate1
instantiate2
instantiate3
precompile

run


saving

`
    .split("\n")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
const blocklist = ["saving"];
/** @type {Record<string,string>} */
const descriptions = {
    workspace: "Workspace setup",
    create_process: "Start Julia",
    init_process: "Initialize",
    pkg: "Package management",
    instantiate1: "instantiate",
    instantiate2: "instantiate",
    instantiate3: "instantiate",
    run: "Evaluating cells",
    evaluate: "Running code",
    registry_update: "Updating package registry",
    waiting_for_others: "Waiting for other notebooks to finish package operations",
    backend_launch: "Connecting to backend",
    backend_requesting: "Requesting a worker",
    backend_created: "Starting Pluto server",
    backend_responded: "Opening notebook file",
    backend_notebook_running: "Switching to live editing",
};
const friendly_name = (/** @type {string} */ task_name) => {
    const descr = descriptions[task_name];
    return descr != null ? descr : isnumber(task_name) ? `Step ${task_name}` : task_name;
};
exports.friendly_name = friendly_name;
const to_ns = (x) => x * 1e9;
/**
 * @param {{
 * status_tree: import("./Editor.js").StatusEntryData?,
 * path: string[],
 * my_clock_is_ahead_by: number,
 * nbpkg: import("./Editor.js").NotebookPkgData?,
 * backend_launch_logs: string?,
 * }} props
 */
const StatusItem = ({ status_tree, path, my_clock_is_ahead_by, nbpkg, backend_launch_logs }) => {
    if (status_tree == null)
        return null;
    const mystatus = path.reduce((entry, key) => entry.subtasks[key], status_tree);
    if (!mystatus)
        return null;
    const [is_open, set_is_open] = (0, Preact_js_1.useState)(path.length < 1);
    const started = path.length > 0 && (0, exports.is_started)(mystatus);
    const finished = started && (0, exports.is_finished)(mystatus);
    const busy = started && !finished;
    const start = mystatus.started_at ?? 0;
    const end = mystatus.finished_at ?? 0;
    const local_busy_time = ((0, RunArea_js_1.useMillisSinceTruthy)(busy) ?? 0) / 1000;
    const mytime = Date.now() / 1000;
    const busy_time = Math.max(local_busy_time, mytime - start - (mystatus.timing === "local" ? 0 : my_clock_is_ahead_by));
    (0, Preact_js_1.useEffect)(() => {
        if (busy || mystatus.success === false) {
            let handle = setTimeout(() => {
                set_is_open(true);
            }, Math.max(100, 500 - path.length * 200));
            return () => clearTimeout(handle);
        }
    }, [busy || mystatus.success === false]);
    useEffectWithPrevious(([old_finished]) => {
        if (!old_finished && finished) {
            // let audio = new Audio("https://proxy.notificationsounds.com/message-tones/succeeded-message-tone/download/file-sounds-1210-succeeded.mp3")
            // audio.play()
            let handle = setTimeout(() => {
                set_is_open(false);
            }, 1800 - path.length * 200);
            return () => clearTimeout(handle);
        }
    }, [finished]);
    const render_child_tasks = () => Object.entries(mystatus.subtasks)
        .sort((a, b) => sort_on(a[1], b[1]))
        .map(([key, _subtask]) => blocklist.includes(key)
        ? null
        : (0, Preact_js_1.html) `<${StatusItem}
                          key=${key}
                          status_tree=${status_tree}
                          my_clock_is_ahead_by=${my_clock_is_ahead_by}
                          path=${[...path, key]}
                          nbpkg=${nbpkg}
                          backend_launch_logs=${backend_launch_logs}
                      />`);
    const render_child_progress = () => {
        let kids = Object.values(mystatus.subtasks);
        let done = kids.reduce((acc, x) => acc + ((0, exports.is_finished)(x) ? 1 : 0), 0);
        let busy = kids.reduce((acc, x) => acc + ((0, exports.is_busy)(x) ? 1 : 0), 0);
        let total = kids.length;
        let failed_indices = kids.reduce((acc, x, i) => (x.success === false ? [...acc, i] : acc), []);
        const onClick = mystatus.name === "evaluate" ? () => (0, ProgressBar_js_1.scroll_to_busy_cell)() : undefined;
        return (0, Preact_js_1.html) `<${DiscreteProgressBar_js_1.DiscreteProgressBar} busy=${busy} done=${done} total=${total} failed_indices=${failed_indices} onClick=${onClick} />`;
    };
    const inner = is_open
        ? // are all kids a numbered task?
            Object.values(mystatus.subtasks).every((x) => isnumber(x.name)) && Object.values(mystatus.subtasks).length > 0
                ? render_child_progress()
                : render_child_tasks()
        : null;
    let inner_progress = null;
    if (started) {
        let t = (0, exports.total_tasks)(mystatus);
        let d = (0, exports.total_done)(mystatus);
        if (t > 1) {
            inner_progress = (0, Preact_js_1.html) `<span class="subprogress-counter">${" "}(${d}/${t})</span>`;
        }
    }
    const can_open = Object.values(mystatus.subtasks).length > 0;
    return path.length === 0
        ? inner
        : (0, Preact_js_1.html) `<pl-status
              data-depth=${path.length}
              class=${(0, ClassTable_js_1.cl)({
            started,
            failed: mystatus.success === false,
            finished,
            busy,
            is_open,
            can_open,
        })}
              aria-expanded=${can_open ? is_open : undefined}
          >
              <div
                  onClick=${(e) => {
            set_is_open(!is_open);
        }}
              >
                  <span class="status-icon"></span>
                  <span class="status-name">${(0, exports.friendly_name)(mystatus.name)}${inner_progress}</span>
                  <span class="status-time">${finished ? (0, RunArea_js_1.prettytime)(to_ns(end - start)) : busy ? (0, RunArea_js_1.prettytime)(to_ns(busy_time)) : null}</span>
              </div>
              ${inner}
              ${is_open && mystatus.name === "pkg"
            ? (0, Preact_js_1.html) `<${PkgTerminalView_js_1.PkgTerminalView} value=${nbpkg?.terminal_outputs?.nbpkg_sync} />`
            : is_open && mystatus.name === "backend_launch"
                ? (0, Preact_js_1.html) `<${PkgTerminalView_js_1.PkgTerminalView} value=${backend_launch_logs} />`
                : undefined}
          </pl-status>`;
};
const isnumber = (str) => /^\d+$/.test(str);
/**
 * @param {import("./Editor.js").StatusEntryData} a
 * @param {import("./Editor.js").StatusEntryData} b
 */
const sort_on = (a, b) => {
    const a_order = global_order.indexOf(a.name);
    const b_order = global_order.indexOf(b.name);
    if (a_order === -1 && b_order === -1) {
        if (a.started_at != null || b.started_at != null) {
            return (a.started_at ?? Infinity) - (b.started_at ?? Infinity);
        }
        else if (isnumber(a.name) && isnumber(b.name)) {
            return parseInt(a.name) - parseInt(b.name);
        }
        else {
            return a.name.localeCompare(b.name);
        }
    }
    else {
        let m = (x) => (x === -1 ? Infinity : x);
        return m(a_order) - m(b_order);
    }
};
/**
 * @param {import("./Editor.js").StatusEntryData} status
 */
const is_finished = (status) => status.finished_at != null;
exports.is_finished = is_finished;
/**
 * @param {import("./Editor.js").StatusEntryData} status
 */
const is_started = (status) => status.started_at != null;
exports.is_started = is_started;
/**
 * @param {import("./Editor.js").StatusEntryData} status
 */
const is_busy = (status) => (0, exports.is_started)(status) && !(0, exports.is_finished)(status);
exports.is_busy = is_busy;
/**
 * @param {import("./Editor.js").StatusEntryData} status
 * @returns {number}
 */
const total_done = (status) => Object.values(status.subtasks).reduce((total, status) => total + (0, exports.total_done)(status), (0, exports.is_finished)(status) ? 1 : 0);
exports.total_done = total_done;
/**
 * @param {import("./Editor.js").StatusEntryData} status
 * @returns {number}
 */
const total_tasks = (status) => Object.values(status.subtasks).reduce((total, status) => total + (0, exports.total_tasks)(status), 1);
exports.total_tasks = total_tasks;
/**
 * @param {import("./Editor.js").StatusEntryData} status
 * @returns {string[]}
 */
const path_to_first_busy_business = (status) => {
    for (let [name, child_status] of Object.entries(status.subtasks).sort((a, b) => sort_on(a[1], b[1]))) {
        if ((0, exports.is_busy)(child_status)) {
            return [name, ...(0, exports.path_to_first_busy_business)(child_status)];
        }
    }
    return [];
};
exports.path_to_first_busy_business = path_to_first_busy_business;
/** @returns {import("./Editor.js").StatusEntryData} */
const useStatusItem = (/** @type {string} */ name, /** @type {boolean} */ started, /** @type {boolean} */ finished, subtasks = {}) => ({
    name,
    subtasks,
    timing: "local",
    started_at: (0, Preact_js_1.useMemo)(() => (started || finished ? Date.now() / 1000 : null), [started || finished]),
    finished_at: (0, Preact_js_1.useMemo)(() => (finished ? Date.now() / 1000 : null), [finished]),
});
exports.useStatusItem = useStatusItem;
/** Like `useEffect`, but the handler function gets the previous deps value as argument. */
const useEffectWithPrevious = (fn, deps) => {
    const ref = (0, Preact_js_1.useRef)(deps);
    (0, Preact_js_1.useEffect)(() => {
        let result = fn(ref.current);
        ref.current = deps;
        return result;
    }, deps);
};
