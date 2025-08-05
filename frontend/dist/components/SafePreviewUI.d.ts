export function SafePreviewUI({ process_waiting_for_permission, risky_file_source, restart, warn_about_untrusted_code }: {
    process_waiting_for_permission: any;
    risky_file_source: any;
    restart: any;
    warn_about_untrusted_code: any;
}): import("../imports/Preact.js").ReactElement;
export function SafePreviewOutput(): import("../imports/Preact.js").ReactElement;
export const SafePreviewSanitizeMessage: "<div class=\"safe-preview-output\">\n<span class=\"offline-icon pluto-icon\"></span><span>Scripts and styles not rendered in <em>Safe preview</em></span>\n</div>";
