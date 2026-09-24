#!/usr/bin/env node
// Serves dist-web/ for testing and for installing onto a phone.
//
// Note on service workers: browsers only register one from a "secure context" — HTTPS, or
// http://localhost. Plain http://192.168.x.x over the LAN will run the app fine but will not
// install it or cache it for offline use. The two ways to get a secure origin on the phone are
// printed on startup.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const ROOT = path.join(__dirname, 'dist-web');
const PORT = Number(process.env.PORT) || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
};

if (!fs.existsSync(ROOT)) {
  console.error('dist-web/ not found — run "npm run build:web" first.');
  process.exit(1);
}

http
  .createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.join(ROOT, rel);
    // never serve outside the build directory
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    fs.readFile(file, (err, buf) => {
      if (err) {
        res.writeHead(404).end('not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
        // the service worker itself must never be served stale, or updates never land
        'Cache-Control': rel === 'sw.js' ? 'no-cache' : 'no-store',
      });
      res.end(buf);
    });
  })
  .listen(PORT, '0.0.0.0', () => {
    const lan = Object.values(os.networkInterfaces())
      .flat()
      .filter((i) => i && i.family === 'IPv4' && !i.internal)
      .map((i) => i.address);

    console.log(`\n  LingoTask web  ·  http://localhost:${PORT}`);
    lan.forEach((ip) => console.log(`                    http://${ip}:${PORT}   (same Wi-Fi — runs, but will not install)`));
    console.log(`
  Telefona kurmak için (ikisinden biri):

  1) USB + adb  — hesap gerekmez, tek seferlik
       Telefonda: Ayarlar > Geliştirici seçenekleri > USB hata ayıklama
       Bilgisayarda: adb reverse tcp:${PORT} tcp:${PORT}
       Telefonun Chrome'unda: http://localhost:${PORT}  ->  menü > Uygulamayı yükle
       Kurulumdan sonra tüm dosyalar önbelleğe alınır; bilgisayar kapalıyken de çalışır.

  2) GitHub Pages — kalıcı adres, güncellemesi kolay
       dist-web/ klasörünü bir repoya push edip Pages'i aç.
`);
  });
