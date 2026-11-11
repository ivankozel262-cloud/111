// Офлайн: складывает в кэш оболочку и все подключённые тренажёры из data.js.
// Править этот файл не нужно. Чтобы телефон подтянул изменения — поменяй version в data.js.
importScripts('data.js');

var DATA = self.EGE_DATA || {};
var CACHE = 'ege-app-' + (DATA.version || 'v1');
var SHELL = ['./', 'index.html', 'data.js', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png'];
var FILES = SHELL.concat(
  (DATA.trainers || [])
    .filter(function (t) { return t.file && t.ready !== false; })
    .map(function (t) { return t.file; })
).filter(function (url, i, all) { return all.indexOf(url) === i; });  // один файл может стоять в нескольких строках

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // Каждый файл отдельно. Если свежий не скачался — берём его из старой версии кэша,
      // чтобы при обновлении тренажёр не пропал из офлайна. Недостающее потом докачивает index.html.
      return Promise.all(FILES.map(function (url) {
        return fetch(new Request(url, { cache: 'reload' })).then(function (res) {
          if (!res || !res.ok) throw new Error('HTTP ' + (res && res.status));
          return cache.put(url, res);
        }).catch(function () {
          return caches.match(url, { ignoreSearch: true }).then(function (old) {
            return old ? cache.put(url, old) : null;
          }).catch(function () { return null; });
        });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return (k.indexOf('ege-app-') === 0 && k !== CACHE) ? caches.delete(k) : null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Сначала отдаём из кэша (мгновенно и без сети), а свежую копию тихо подтягиваем на следующий раз.
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {
        // нет в текущей версии — поискать в любой версии кэша
        return hit || caches.match(req, { ignoreSearch: true });
      }).then(function (hit) {
        var fresh = fetch(req).then(function (res) {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        });
        if (hit) {
          event.waitUntil(fresh.catch(function () {}));
          return hit;
        }
        return fresh.catch(function () {
          return new Response('Нет сети, и этого файла ещё нет в кэше.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      });
    })
  );
});
