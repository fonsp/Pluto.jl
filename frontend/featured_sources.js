export default {
    // check out https://github.com/JuliaPluto/pluto-developer-instructions/blob/main/How%20to%20update%20the%20featured%20notebooks.md to learn more
    sources: [
        {
            url: "https://featured.plutojl.org/pluto_export.json",
            // this is one month before the expiry date of our domain registration at njal.la
            valid_until: "2025-10",
            id: "featured pluto",
        },
        {
            id: "featured pluto",
            url: "https://cdn.jsdelivr.net/gh/JuliaPluto/featured@v4/pluto_export.json",
            integrity: "sha256-YT5Msj4Iy4cJIuHQi09h3+AwxzreK46WS6EySbPPmJM=",
        },
    ],
}
