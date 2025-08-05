export function FeaturedCard({ entry, source_manifest, direct_html_links, disable_links, image_loading }: {
    source_manifest?: import("./Featured.js").SourceManifest;
    entry: import("./Featured.js").SourceManifestNotebookEntry;
    direct_html_links: boolean;
    disable_links: boolean;
    image_loading?: string;
}): import("../../imports/Preact.js").ReactElement;
export type AuthorInfo = {
    name: string | null;
    url: string | null;
    image: string | null;
    has_coauthors?: boolean;
};
