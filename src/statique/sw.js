/* ==================================================================
   SEVEN7 — SERVICE WORKER

   STRATÉGIE : LE RÉSEAU D'ABORD, TOUJOURS.

   Un service worker classique sert le cache en priorité : l'application
   démarre instantanément, mais l'utilisateur peut travailler des
   semaines sur une version périmée sans le savoir. Pour un outil
   d'audit, c'est inacceptable — un moteur comptable corrigé doit
   atteindre le poste du collaborateur, pas dormir derrière un cache.

   Ici, chaque requête part au réseau. Le cache ne sert que si le
   réseau échoue, pour que le dossier reste consultable en déplacement
   ou en zone mal couverte.

   Le nom du cache porte la version : à chaque nouvelle construction,
   les anciens caches sont supprimés à l'activation.
   ================================================================== */

var VERSION = '@@VERSION@@';
var CACHE = 'seven7-' + VERSION;

/* Ressources conservées pour le mode hors ligne. */
var RESSOURCES = [
    './',
    './index.html',
    './manifest.json',
    './assets/seven7-icon-192.png',
    './assets/seven7-icon-512.png'
];

self.addEventListener('install', function(e){
    /* skipWaiting : la nouvelle version prend la main sans attendre la
       fermeture de tous les onglets. Sur un outil métier, différer la
       mise à jour d'un moteur de calcul n'a pas de sens. */
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE).then(function(c){
            return c.addAll(RESSOURCES).catch(function(){ /* hors ligne à l'installation */ });
        })
    );
});

self.addEventListener('activate', function(e){
    e.waitUntil(
        caches.keys().then(function(noms){
            return Promise.all(noms.map(function(n){
                if(n !== CACHE) return caches.delete(n);
            }));
        }).then(function(){ return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function(e){
    var req = e.request;

    /* Seules les requêtes de navigation et les ressources propres à
       l'application passent par ici. Firestore, le SDK Firebase et
       lz-string doivent atteindre le réseau sans interception : les
       mettre en cache casserait la synchronisation. */
    if(req.method !== 'GET') return;
    var url;
    try{ url = new URL(req.url); }catch(err){ return; }
    if(url.origin !== self.location.origin) return;

    e.respondWith(
        fetch(req).then(function(rep){
            /* On ne met en cache que ce qui a réellement abouti. */
            if(rep && rep.status === 200 && rep.type === 'basic'){
                var copie = rep.clone();
                caches.open(CACHE).then(function(c){ c.put(req, copie); });
            }
            return rep;
        }).catch(function(){
            /* Réseau indisponible : on sert la dernière version connue. */
            return caches.match(req).then(function(hit){
                if(hit) return hit;
                if(req.mode === 'navigate') return caches.match('./index.html');
                return new Response('', { status: 504, statusText: 'Hors ligne' });
            });
        })
    );
});

/* Permet à la page de forcer la prise en main immédiate après une
   mise à jour détectée. */
self.addEventListener('message', function(e){
    if(e.data === 'SEVEN7_ACTIVER_MAINTENANT') self.skipWaiting();
});
