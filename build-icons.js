#!/usr/bin/env node
// Renders the LingoTask mark and writes build/icon.ico (desktop) plus the PNG sizes the PWA
// manifest needs. Run with: npm run icons
const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const OUT = path.join(__dirname, 'build');
const PAGE = `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;width:512px;height:512px;overflow:hidden}
.b{width:512px;height:512px;background:linear-gradient(145deg,#1f4278,#17325c);
   display:grid;place-items:center;font:700 300px/1 'Segoe UI',sans-serif;color:#fff;border-radius:96px}
</style><div class="b">L</div>`;

app.whenReady().then(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const win = new BrowserWindow({ width: 512, height: 512, show: false, frame: false, transparent: true });
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(PAGE)}`);
  await new Promise((r) => setTimeout(r, 500));
  const img = await win.webContents.capturePage();
  const at = (s) => (s === 512 ? img : img.resize({ width: s, height: s, quality: 'best' }));

  for (const s of [192, 512]) fs.writeFileSync(path.join(OUT, `icon-${s}.png`), at(s).toPNG());

  // ICO: a directory of PNG-encoded entries (Vista+ format)
  const sizes = [256, 128, 64, 48, 32, 16];
  const pngs = sizes.map((s) => at(s).toPNG());
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = 6 + sizes.length * 16;
  const dir = sizes.map((s, i) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(s === 256 ? 0 : s, 0);
    e.writeUInt8(s === 256 ? 0 : s, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(pngs[i].length, 8);
    e.writeUInt32LE(offset, 12);
    offset += pngs[i].length;
    return e;
  });
  fs.writeFileSync(path.join(OUT, 'icon.ico'), Buffer.concat([header, ...dir, ...pngs]));
  console.log(`icons written to build/ (ico + ${[192, 512].join('/')} png)`);
  app.quit();
});
