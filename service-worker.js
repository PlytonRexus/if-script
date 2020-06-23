let CACHE_VERSIONS = {
  'css': 1,
  'terp': 1,
  'fonts': 2,
  'images': 1
};

let CURRENT_CACHES = {};

let addrs = {
  css: ['css/index.css', 'downloadable/if_r.css'],
  fonts: ['assets/fonts/FiraMono-Regular.ttf', 'assets/fonts/VarelaRound-Regular.ttf'],
  images: ['assets/images/book-background0.jpg', 'assets/images/if-logo.png']
};

let props = Object.keys(CACHE_VERSIONS);
props.forEach(val => {
  CURRENT_CACHES[val] = `${val}-v${CACHE_VERSIONS[val]}`;
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    props.forEach(prop => {
      caches
        .open(CURRENT_CACHES[prop])
        .then(cache => {
          Object.keys(addrs).forEach(val => {
            val.forEach(addr => {
              cache.add(addr);
            });
          });
        })
        .catch(e => console.log(e))
    })
  );
});

self.addEventListener('fetch', function (event) {
  let preTypes = [/\/js\//, /\/css\//, /\/images\//, /\/fonts\//];

  let index = preTypes.findIndex(preType => {
      if (event.request.url.match(preType))
          return true;
      else return false;
  });

  let prop = 'css';

  if (index !== -1)
      prop = event.request.url.match(preTypes[index])[0].replace(/\//g, "");

  event.respondWith(
      caches.open(CURRENT_CACHES[prop]).then(function (cache) {
          return cache.match(event.request).then(function (response) {
              if (response) {
                  return response;
              }
              return fetch(event.request.clone()).then(function (response) {
                  if (response.status < 400 &&
                      response.url &&
                      response.url.match(new RegExp(prop, 'i'))) {
                      cache.put(event.request, response.clone());
                  }
                  return response;
              }).catch(e =>  console.log("Why not?", e));
          }).catch(function (error) {
              throw error;
          });
      })
  );
});