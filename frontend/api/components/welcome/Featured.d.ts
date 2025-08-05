export function Featured({ sources, direct_html_links }: {
    sources: FeaturedSource[] | null;
    direct_html_links: boolean;
}): import("../../imports/Preact.js").ReactElement;
export type SourceManifestNotebookEntry = {
    id: string;
    hash: string;
    html_path?: string;
    statefile_path?: string;
    notebookfile_path?: string;
    frontmatter?: Record<string, any>;
};
export type SourceManifestCollectionEntry = {
    title?: string;
    description?: string;
    tags?: Array<string> | "everything";
};
export type SourceManifest = {
    notebooks: Record<string, SourceManifestNotebookEntry>;
    collections?: Array<SourceManifestCollectionEntry>;
    pluto_version?: string;
    julia_version?: string;
    format_version?: string;
    source_url?: string;
    title?: string;
    description?: string;
    binder_url?: string;
    slider_server_url?: string;
};
export type FeaturedSource = {
    url: string;
    id?: string;
    integrity?: string;
    valid_until?: string;
};
