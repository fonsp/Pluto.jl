/**
 * Node.js integration for Pluto standalone library
 *
 * This module provides the necessary polyfills and environment setup
 * to run Pluto's browser-based frontend code in Node.js environments.
 */

import { webcrypto } from "crypto";
import { WebSocket as NodeWebSocket } from "ws";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost:1234",
    pretendToBeVisual: true,
    resources: "usable",
});

// Copy jsdom globals to Node.js global scope
Object.assign(global, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    SVGElement: dom.window.SVGElement,
    MessageEvent: dom.window.MessageEvent,
    alert: (message) => console.log("ALERT:", message),
    Buffer,
});

// Browser-compatible WebSocket wrapper for Node.js
global.WebSocket = class WebSocket extends NodeWebSocket {
    constructor(url, protocols) {
        super(url, protocols);
        const originalOn = this.on.bind(this);

        this.on = (event, handler) => {
            if (event === "message") {
                return originalOn("message", (data) => {
                    handler({
                        data: {
                            arrayBuffer: () =>
                                Promise.resolve(Buffer.isBuffer(data) ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data),
                        },
                        type: "message",
                        target: this,
                    });
                });
            }
            return originalOn(event, handler);
        };

        this.addEventListener = (event, handler) => this.on(event, handler);
    }
};

// Add missing DOM methods that jsdom doesn't provide
dom.window.HTMLElement.prototype.scrollIntoView = function () {};

// Use Node.js crypto if jsdom doesn't provide sufficient crypto support
if (!global.crypto || !global.crypto.subtle) {
    global.crypto = webcrypto;
}
