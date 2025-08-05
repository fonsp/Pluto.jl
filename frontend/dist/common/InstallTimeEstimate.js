"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.time_estimate = exports.usePackageTimingData = exports.get_data = void 0;
const Preact_js_1 = require("../imports/Preact.js");
const lodash_js_1 = __importDefault(require("../imports/lodash.js"));
const loading_times_url = `https://julia-loading-times-test.netlify.app/pkg_load_times.csv`;
const package_list_url = `https://julia-loading-times-test.netlify.app/top_packages_sorted_with_deps.txt`;
/** @typedef {{ install: Number, precompile: Number, load: Number }} LoadingTime */
/**
 * @typedef PackageTimingData
 * @type {{
 *  times: Map<String,LoadingTime>,
 *  packages: Map<String,String[]>,
 * }}
 */
/** @type {{ current: Promise<PackageTimingData>? }} */
const data_promise_ref = { current: null };
const get_data = () => {
    if (data_promise_ref.current != null) {
        return data_promise_ref.current;
    }
    else {
        const times_p = fetch(loading_times_url)
            .then((res) => res.text())
            .then((text) => {
            const lines = text.split("\n");
            const header = lines[0].split(",");
            return new Map(lines.slice(1).map((line) => {
                let [pkg, ...times] = line.split(",");
                return [pkg, { install: Number(times[0]), precompile: Number(times[1]), load: Number(times[2]) }];
            }));
        });
        const packages_p = fetch(package_list_url)
            .then((res) => res.text())
            .then((text) => new Map(text.split("\n").map((line) => {
            let [pkg, ...deps] = line.split(",");
            return [pkg, deps];
        })));
        data_promise_ref.current = Promise.all([times_p, packages_p]).then(([times, packages]) => ({ times, packages }));
        return data_promise_ref.current;
    }
};
exports.get_data = get_data;
const usePackageTimingData = () => {
    const [data, set_data] = (0, Preact_js_1.useState)(/** @type {PackageTimingData?} */ (null));
    (0, Preact_js_1.useEffect)(() => {
        (0, exports.get_data)().then(set_data);
    }, []);
    return data;
};
exports.usePackageTimingData = usePackageTimingData;
const recursive_deps = (/** @type {PackageTimingData} */ data, /** @type {string} */ pkg, found = []) => {
    const deps = data.packages.get(pkg);
    if (deps == null) {
        return [];
    }
    else {
        const newfound = lodash_js_1.default.union(found, deps);
        return [...deps, ...lodash_js_1.default.difference(deps, found).flatMap((dep) => recursive_deps(data, dep, newfound))];
    }
};
const time_estimate = (/** @type {PackageTimingData} */ data, /** @type {string[]} */ packages) => {
    let deps = packages.flatMap((pkg) => recursive_deps(data, pkg));
    let times = lodash_js_1.default.uniq([...packages, ...deps])
        .map((pkg) => data.times.get(pkg))
        .filter((x) => x != null);
    let sum = (xs) => xs.reduce((acc, x) => acc + (x == null || isNaN(x) ? 0 : x), 0);
    return {
        install: sum(times.map(lodash_js_1.default.property("install"))) * timing_weights.install,
        precompile: sum(times.map(lodash_js_1.default.property("precompile"))) * timing_weights.precompile,
        load: sum(times.map(lodash_js_1.default.property("load"))) * timing_weights.load,
    };
};
exports.time_estimate = time_estimate;
const timing_weights = {
    // Because the GitHub Action runner has superfast internet
    install: 2,
    // Because the GitHub Action runner has average compute speed
    load: 1,
    // Because precompilation happens in parallel
    precompile: 0.3,
};
