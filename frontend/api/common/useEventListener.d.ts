export function useEventListener(element: EventListenerAddable | import("../imports/Preact.js").Ref<EventListenerAddable>, event_name: string, handler: EventListenerOrEventListenerObject, deps: any[] | undefined): void;
export type EventListenerAddable = Document | HTMLElement | Window | EventSource | MediaQueryList | null;
