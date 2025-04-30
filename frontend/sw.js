const CACHE_NAME = "pluto-offline-cdn-v1"
const CDN_DOMAINS = ["unpkg.com", "esm.sh", "cdn.jsdelivr.net"]

self.addEventListener("install", (event) => {
    self.skipWaiting()
})

self.addEventListener("activate", (event) => {
    event.waitUntil(clients.claim())
})

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url)

    // Check if the request is for one of our CDN domains
    if (CDN_DOMAINS.some((domain) => url.hostname === domain)) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((response) => {
                    if (response) {
                        // Return cached response immediately
                        return response
                    }

                    // If not in cache, fetch it and cache it
                    return fetch(event.request)
                        .then((networkResponse) => {
                            cache.put(event.request, networkResponse.clone())
                            return networkResponse
                        })
                        .catch((error) => {
                            console.error("Fetch failed:", error)
                            throw error
                        })
                })
            })
        )
    }
})
