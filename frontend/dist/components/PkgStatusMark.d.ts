export function nbpkg_fingerprint(nbpkg: any): any[];
export function nbpkg_fingerprint_without_terminal(nbpkg: any): any[];
export function package_status({ nbpkg, package_name, available_versions, is_disable_pkg, package_url }: {
    package_name: string;
    package_url?: string;
    is_disable_pkg: boolean;
    available_versions?: string[];
    nbpkg: import("./Editor.js").NotebookPkgData | null;
}): PackageStatus;
export function PkgStatusMark({ package_name, pluto_actions, notebook_id, nbpkg }: {
    package_name: string;
    pluto_actions: any;
    notebook_id: string;
    nbpkg: import("./Editor.js").NotebookPkgData | null;
}): import("../imports/Preact.js").ReactElement;
export function PkgActivateMark({ package_name }: {
    package_name: any;
}): import("../imports/Preact.js").ReactElement;
export type PackageStatus = {
    status: string;
    hint: import("../imports/Preact.js").ReactElement;
    hint_raw: string;
    available_versions: string[] | null;
    chosen_version: string | null;
    package_url: string | null;
    busy: boolean;
    offer_update: boolean;
};
