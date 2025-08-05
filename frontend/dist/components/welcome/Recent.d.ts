export function Recent({ client, connected, remote_notebooks, CustomRecent, on_start_navigation }: {
    client: import("../../common/PlutoConnection.js").PlutoConnection | null;
    connected: boolean;
    remote_notebooks: Array<import("./Welcome.js").NotebookListEntry>;
    CustomRecent: preact.ReactElement | null;
    on_start_navigation: (string: any) => void;
}): preact.ReactElement;
export type CombinedNotebook = {
    path: string;
    transitioning: boolean;
    entry?: import("./Welcome.js").NotebookListEntry;
};
import * as preact from "../../imports/Preact.js";
