declare namespace _default {
    let sources: ({
        url: string;
        valid_until: string;
        id: string;
        integrity?: undefined;
    } | {
        id: string;
        url: string;
        integrity: string;
        valid_until?: undefined;
    })[];
}
export default _default;
