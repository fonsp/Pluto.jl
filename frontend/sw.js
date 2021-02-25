// mostly based on https://developers.google.com/web/fundamentals/primers/service-workers

var CACHE_NAME = "pluto-wasm-cache-v4"

self.addEventListener("install", function (event) {
    console.log("Hello from service worker 👋")
    // Perform install steps
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            console.log("Opened cache")
        })
    )
})

const whiteList = [
    "www.gstatic.com",
    "fonts.gstatic.com",
    "fonts.googleapis.com",
    "cdn.jsdelivr.net",
    "cdnjs.cloudflare.com",
    "unpkg.com",
    // "fonsp-julia-wasm-build.netlify.app",
    "keno.github.io",
    // "mkhj.fra1.cdn.digitaloceanspaces.com",
]

function shouldCache(request) {
    const url = new URL(request.url)
    return request.method === "GET" && whiteList.includes(url.host)
}

self.addEventListener("fetch", function (event) {
    if (navigator.userAgent.includes("Firefox")) {
        return
    }
    if (!shouldCache(event.request)) {
        // console.log("skipping cache")
        return
    }
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then(function (response) {
                // Cache hit - return response
                if (response) {
                    // console.warn("CACHE HIT", event.request)
                    return response
                }

                // console.warn("Cache miss", event.request.url)

                return fetch(event.request).then(function (response) {
                    // Check if we received a valid response
                    if (!response || response.status !== 200) {
                        return response
                    }

                    // console.warn("FETCHED")

                    // Clone the response. A response is a stream
                    // and because we want the browser to consume the response
                    // as well as the cache consuming the response, we need
                    // to clone it so we have two streams.
                    var responseToCache = response.clone()

                    // cache.add()

                    cache.put(event.request, responseToCache)

                    return response
                })
            })
        })
    )
})
