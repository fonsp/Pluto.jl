export default {
    // check out https://github.com/JuliaPluto/pluto-developer-instructions/blob/main/How%20to%20update%20the%20featured%20notebooks.md to learn more
    sources: [
        // 1: pluto featured notebooks
        {
            // 1a: pluto featured notebooks from plutojl.org, this is preffered
            id: "featured pluto",
            url: "https://featured.plutojl.org/pluto_export.json",
            // this is one month before the expiry date of our domain registration at njal.la
            valid_until: "2025-10",
        },
        {
            // 1b: backup for the featured notebooks from jsdelivr, in case the live version (1a) does not work. The "id" is used for this.
            id: "featured pluto",
            url: "https://cdn.jsdelivr.net/gh/JuliaPluto/featured@v5/pluto_export.json",
            integrity: "sha256-+zI9b/gHEIJGV/DrckBY85hkxNWGIewgYffkAkEq4/w=",
        },
        {
            // 2: featured notebooks from plutojl.org
            id: "pluto website",
            url: "https://plutojl.org/pluto_export.json",
            // this is one month before the expiry date of our domain registration at njal.la
            valid_until: "2025-10",
        },
        {
            // 3: featured notebooks from computational thinkin
            id: "computational thinking",
            url: "https://computationalthinking.mit.edu/Fall24/pluto_export.json",
            // this is one month before the expiry date of our domain registration at njal.la
            valid_until: "2025-10",
        },
    ],
}
