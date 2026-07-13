const fs = require('fs');
const path = require('path');
const https = require('https');

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// 1. Create manifest.json
const manifest = {
  name: "Nexus Chat",
  short_name: "Nexus",
  description: "Secure, real-time messenger",
  start_url: "/",
  display: "standalone",
  background_color: "#09090b",
  theme_color: "#09090b",
  orientation: "portrait-primary",
  icons: [
    {
      src: "/icon-192.png",
      sizes: "192x192",
      type: "image/png"
    },
    {
      src: "/icon-512.png",
      sizes: "512x512",
      type: "image/png"
    }
  ]
};

fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

// 2. Create sw.js
const swCode = `
const CACHE_NAME = 'nexus-chat-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // We just need a fetch handler to satisfy PWA installability requirements
  // We won't aggressively cache everything to avoid breaking the chat app
  event.respondWith(fetch(event.request).catch(() => {
    return caches.match(event.request);
  }));
});
`;
fs.writeFileSync(path.join(publicDir, 'sw.js'), swCode.trim());

// 3. Download icons
const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

async function run() {
  console.log('Downloading icons...');
  await download('https://api.dicebear.com/7.x/shapes/png?seed=nexus&size=192&backgroundColor=09090b', path.join(publicDir, 'icon-192.png'));
  await download('https://api.dicebear.com/7.x/shapes/png?seed=nexus&size=512&backgroundColor=09090b', path.join(publicDir, 'icon-512.png'));
  console.log('PWA Setup complete!');
}

run().catch(console.error);
