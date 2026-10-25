// Packs the whole site into ONE self-contained HTML file, for sending to someone (email / WhatsApp).
//   node tools/build-single.js <out.html>
// CSS, scripts and photos are inlined (photos re-encoded smaller). Needs ImageMagick `convert`.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const site = path.join(__dirname, '..');
const out = process.argv[2] || path.join(site, 'concept-2-preview.html');
const read = (f) => fs.readFileSync(path.join(site, f), 'utf8');
const scriptSafe = (s) => s.replace(/<\/script/gi, '<\\/script');

const photo = (rel) => {
  const buf = execFileSync('convert', [path.join(site, rel), '-resize', '1400x1400>', '-strip', '-quality', '68', 'jpg:-']);
  return 'data:image/jpeg;base64,' + buf.toString('base64');
};

let html = read('index.html');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, f) => `<style>\n${read(f)}\n</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => {
  let js = read(f);
  if (f === 'data/weeks.js') js = js.replace(/'(images\/[^']+\.jpg)'/g, (m, rel) => `'${photo(rel)}'`);
  if (f === 'js/app.js') js = js.replace(' (see images/CREDITS.md)', '').replace(/<a href="images\/CREDITS.md"[^>]*>[^<]*<\/a>/, '<span>צילומים: Wikimedia Commons</span>');
  return `<script>\n${scriptSafe(js)}\n</script>`;
});
fs.writeFileSync(out, html);
console.log(`${out}: ${(fs.statSync(out).size / 1048576).toFixed(1)} MB`);
