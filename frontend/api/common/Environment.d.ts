export function get_environment(client: any): Promise<any>;
export default environment;
declare function environment({ client, editor, imports: { preact: { html, useEffect, useState, useMemo }, }, }: {
    client: any;
    editor: any;
    imports: {
        preact: {
            html: any;
            useEffect: any;
            useState: any;
            useMemo: any;
        };
    };
}): {
    custom_editor_header_component: () => boolean;
    custom_welcome: () => boolean;
    custom_recent: () => boolean;
    custom_filepicker: () => boolean;
};
