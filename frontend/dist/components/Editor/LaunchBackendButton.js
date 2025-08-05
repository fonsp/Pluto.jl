"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditorLaunchBackendButton = void 0;
const Preact_js_1 = require("../../imports/Preact.js");
const preact = __importStar(require("../../imports/Preact.js"));
const EditOrRunButton_js_1 = require("../EditOrRunButton.js");
const RunLocal_js_1 = require("../../common/RunLocal.js");
const Binder_js_1 = require("../../common/Binder.js");
const immer_js_1 = __importStar(require("../../imports/immer.js"));
const EditorLaunchBackendButton = ({ editor, launch_params, status }) => {
    try {
        const EnvRun = (0, Preact_js_1.useMemo)(
        // @ts-ignore
        () => window?.pluto_injected_environment?.environment?.({ client: editor.client, editor, imports: { immer: immer_js_1.default, preact } })?.custom_run_or_edit, [editor.client, editor]);
        // @ts-ignore
        if (window?.pluto_injected_environment?.provides_backend) {
            // @ts-ignore
            return (0, Preact_js_1.html) `<${EnvRun} editor=${editor} backend_phases=${Binder_js_1.BackendLaunchPhase} launch_params=${launch_params} />`;
            // Don't allow a misconfigured environment to stop offering other backends
        }
    }
    catch (e) { }
    if (status == null)
        return null;
    if (status.offer_local)
        return (0, Preact_js_1.html) `<${EditOrRunButton_js_1.RunLocalButton}
            start_local=${() => (0, RunLocal_js_1.start_local)({
            setStatePromise: editor.setStatePromise,
            connect: editor.connect,
            launch_params: launch_params,
        })}
        />`;
    if (status.offer_binder)
        return (0, Preact_js_1.html) `<${EditOrRunButton_js_1.BinderButton}
            offer_binder=${status.offer_binder}
            start_binder=${() => (0, Binder_js_1.start_binder)({
            setStatePromise: editor.setStatePromise,
            connect: editor.connect,
            launch_params: launch_params,
        })}
            notebookfile=${launch_params.notebookfile == null ? null : new URL(launch_params.notebookfile, window.location.href).href}
            notebook=${editor.state.notebook}
        />`;
    return null;
};
exports.EditorLaunchBackendButton = EditorLaunchBackendButton;
