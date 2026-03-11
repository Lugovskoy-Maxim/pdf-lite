// Placeholder service worker — prevents 404 for /sw.js (e.g. from extensions or PWA probes).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
