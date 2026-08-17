var CACHE_NAME = 'studybuddy-v3';

var URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('Cache opened');
            return cache.addAll(URLS_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        fetch(event.request).then(function(response) {
            // Got network response, cache it
            if (response && response.status === 200) {
                var responseClone = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(event.request, responseClone);
                });
            }
            return response;
        }).catch(function() {
            // Network failed, try cache
            return caches.match(event.request).then(function(cachedResponse) {
                if (cachedResponse) {
                    return cachedResponse;
                }
                // Return offline page for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});