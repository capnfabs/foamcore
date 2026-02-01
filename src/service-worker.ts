/// <reference lib="webworker" />
import { manifest, version } from "@parcel/service-worker";

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = `foam-core-calc-${version}`;

async function install(): Promise<void> {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(manifest);
}

async function activate(): Promise<void> {
  const keys = await caches.keys();
  await Promise.all(
    keys.map((key) => {
      if (key !== CACHE_NAME) {
        return caches.delete(key);
      }
    })
  );
}

async function fetchHandler(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  return fetch(request);
}

self.addEventListener("install", (e) => {
  e.waitUntil(install());
});

self.addEventListener("activate", (e) => {
  e.waitUntil(activate());
});

self.addEventListener("fetch", (e) => {
  e.respondWith(fetchHandler(e.request));
});
