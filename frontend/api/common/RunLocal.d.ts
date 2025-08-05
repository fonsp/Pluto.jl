export function start_local({ setStatePromise, connect, launch_params }: {
    launch_params: import("../components/Editor.js").LaunchParameters;
    setStatePromise: any;
    connect: () => Promise<void>;
}): Promise<void>;
