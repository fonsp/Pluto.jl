export declare class Spline {
    points: number[][];
    lengths: number[];
    totalLength: number;
    private prev?;
    constructor(points?: number[][]);
    addPoint: (point: number[]) => void;
    clear: () => void;
    getSplinePoint: (rt: number) => number[];
}
declare type AnimationState = 'stopped' | 'idle' | 'animating';
declare type Animation = {
    from: number[];
    to: number[];
    start: number;
    duration: number;
};
export declare class PerfectCursor {
    state: AnimationState;
    queue: Animation[];
    timestamp: number;
    lastRequestId: number;
    timeoutId: any;
    prevPoint?: number[];
    spline: Spline;
    cb: (point: number[]) => void;
    constructor(cb: (point: number[]) => void);
    addPoint: (point: number[]) => void;
    animateNext: (animation: Animation) => void;
    static MAX_INTERVAL: number;
    dispose: () => void;
}
export {};
