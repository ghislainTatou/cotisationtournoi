// Service worker minimal : rend l'application installable sur l'écran d'accueil.
// Aucune donnée n'est mise en cache : les sessions et les paiements doivent
// toujours être lus sur le serveur pour éviter des informations périmées.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Comportement réseau par défaut (pas de respondWith).
});
