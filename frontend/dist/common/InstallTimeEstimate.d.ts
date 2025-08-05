export function get_data(): Promise<PackageTimingData>;
export function usePackageTimingData(): PackageTimingData;
export function time_estimate(data: PackageTimingData, packages: string[]): {
    install: number;
    precompile: number;
    load: number;
};
export type LoadingTime = {
    install: number;
    precompile: number;
    load: number;
};
export type PackageTimingData = {
    times: Map<string, LoadingTime>;
    packages: Map<string, string[]>;
};
