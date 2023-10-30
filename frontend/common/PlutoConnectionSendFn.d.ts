/** Send a message to the Pluto backend, and return a promise that resolves when the backend sends a response. Not all messages receive a response. */
export function SendFn (
    message_type: string,
    body?: Object,
    metadata?: {notebook_id?: string, cell_id?: string},
    /** 
     * If false, then the server response will go through the `on_unrequested_update` callback of this client. (This is useful for requests that will cause a state change, like "Run cell". We want the response (state patch) to be handled by the `on_unrequested_update` logic.)
     * 
     * If true (default), then the response will *only* go to you. This is useful for isolated requests, like "Please autocomplete `draw_rectang`".
     * @default true */
    skip_onupdate_callback?: boolean,
    ): Promise<Record<string,any>>
