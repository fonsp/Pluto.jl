export function Welcome({ launch_params }: {
    launch_params: LaunchParameters;
}): preact.ReactElement;
export type NotebookListEntry = {
    notebook_id: string;
    path: string;
    in_temp_dir: boolean;
    shortpath: string;
    process_status: string;
};
export type LaunchParameters = {
    pluto_server_url: string | null;
    featured_direct_html_links: boolean;
    featured_sources: import("./Featured.js").FeaturedSource[] | null;
    featured_source_url?: string;
    featured_source_integrity?: string;
};
import * as preact from "../../imports/Preact.js";
