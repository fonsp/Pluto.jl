export function createSilentAudio(time: any, freq?: number): string;
export function create_recorder(): Promise<{
    start: () => void;
    stop: () => Promise<any>;
}>;
