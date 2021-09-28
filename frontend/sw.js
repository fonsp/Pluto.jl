// mostly based on https://developers.google.com/web/fundamentals/primers/service-workers

const DEBUG = false
const noop = () => {}
const logger = {
    log: DEBUG ? console.log : noop,
    warn: DEBUG ? console.warn : noop,
    info: DEBUG ? console.info : noop,
}
var CACHE_NAME = "pluto-cache-v2"

self.addEventListener("install", (event) => {
    logger.log("Hello from service worker 👋")
    // Perform install steps
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            logger.log("Opened cache")
        })
    )
})

const allowList = ["www.gstatic.com", "fonts.gstatic.com", "fonts.googleapis.com", "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "unpkg.com"]

function shouldCache(request) {
    const url = new URL(request.url)
    return request.method === "GET" && allowList.includes(url.host) && !url.toString().includes("skip_sw")
}

self.addEventListener("fetch", (event) => {
    // if (navigator.userAgent.includes("Firefox")) {
    //     return
    // }
    if (!shouldCache(event.request)) {
        logger.log("skipping cache")
        return
    }
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) =>
            cache.match(event.request).then((response) => {
                if (response != null) {
                    logger.info("CACHE HIT", event.request)
                    return response
                } else {
                    logger.warn("Cache miss", event.request.url)

                    return fetch(event.request).then(function (response) {
                        // Check if we received a valid response
                        if (!response || response.status !== 200) {
                            return response
                        } else {
                            logger.warn("FETCHED")

                            // Clone the response. A response is a stream
                            // and because we want the browser to consume the response
                            // as well as the cache consuming the response, we need
                            // to clone it so we have two streams.
                            var responseToCache = response.clone()
                            cache.put(event.request, responseToCache)

                            return response
                        }
                    })
                }
            })
        )
    )
})
