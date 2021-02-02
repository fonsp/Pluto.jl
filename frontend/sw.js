// mostly based on https://developers.google.com/web/fundamentals/primers/service-workers

var CACHE_NAME = "pluto-cache-v1"

self.addEventListener("install", function (event) {
    console.log("Hello from service worker 👋")
    // Perform install steps
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            console.log("Opened cache")
        })
    )
})

const whiteList = ["www.gstatic.com", "fonts.gstatic.com", "fonts.googleapis.com", "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "unpkg.com"]

function shouldCache(request) {
    const url = new URL(request.url)
    return request.method === "GET" && whiteList.includes(url.host) && !url.search.includes("skip_sw")
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
        caches.match(event.request).then(function (response) {
            // Cache hit - return response
            if (response) {
                return response
            }

            return fetch(event.request).then(function (response) {
                // Check if we received a valid response
                if (!response || response.status !== 200 || response.type !== "basic") {
                    return response
                }

                // Clone the response. A response is a stream
                // and because we want the browser to consume the response
                // as well as the cache consuming the response, we need
                // to clone it so we have two streams.
                var responseToCache = response.clone()
                caches.open(CACHE_NAME).then(function (cache) {
                    cache.put(event.request, responseToCache)
                })

                return response
            })
        })
    )
})
