export function timeout_promise<T>(promise: Promise<T>, time_ms: number): Promise<T>;
export function resolvable_promise<T>(): {
    current: Promise<T>;
    resolve: (value: T) => void;
    reject: (error: any) => void;
};
export function ws_address_from_base(base_url: string | URL): string;
export function create_pluto_connection({ on_unrequested_update, on_reconnect, on_connection_status, connect_metadata, ws_address, }: {
    on_unrequested_update: (message: PlutoMessage, by_me: boolean) => void;
    on_reconnect: () => Promise<boolean>;
    on_connection_status: (connection_status: boolean, hopeless: boolean) => void;
    connect_metadata?: any;
    ws_address?: string;
}): Promise<PlutoConnection>;
/**
 * Open a 'raw' websocket connection to an API with MessagePack serialization. The method is asynchonous, and resolves to a
 */
export type WebsocketConnection = {
    socket: WebSocket;
    send: Function;
};
export type PlutoConnection = {
    session_options: Record<string, any>;
    send: typeof import("./PlutoConnectionSendFn").SendFn;
    kill: (allow_reconnect?: boolean) => void;
    version_info: {
        julia: string;
        pluto: string;
        dismiss_update_notification: boolean;
    };
    notebook_exists: boolean;
    message_log: import("./Stack.js").Stack<any>;
};
export type PlutoMessage = any;
