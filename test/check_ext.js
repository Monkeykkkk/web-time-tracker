// Manifest sanity check: every path the manifest references must exist,
// and no file may start with "_" (Chromium reserves that prefix and will
// refuse to load the extension).
//
// Usage: node test/check_ext.js <extension-dir>

const fs = require('fs');
const path = require('path');

const root = process.argv[2];
if (!root) {
  console.log('usage: node test/check_ext.js <extension-dir>');
  process.exit(2);
}

const manifestPath = path.join(root, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.log('FAIL  manifest.json not found in ' + root);
  process.exit(1);
}

let m;
try {
  m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (e) {
  console.log('FAIL  manifest.json is not valid JSON: ' + e.message);
  process.exit(1);
}

console.log('manifest_version ' + m.manifest_version + ' | ' + m.name + ' v' + m.version);

const refs = [];

if (m.background && m.background.service_worker) refs.push(['background.service_worker', m.background.service_worker]);
if (m.background && m.background.scripts) m.background.scripts.forEach((s, i) => refs.push(['background.scripts[' + i + ']', s]));
if (m.action && m.action.default_popup) refs.push(['action.default_popup', m.action.default_popup]);
if (m.options_page) refs.push(['options_page', m.options_page]);
if (m.options_ui && m.options_ui.page) refs.push(['options_ui.page', m.options_ui.page]);

(m.content_scripts || []).forEach((cs, i) => {
  (cs.js || []).forEach((s, j) => refs.push(['content_scripts[' + i + '].js[' + j + ']', s]));
  (cs.css || []).forEach((s, j) => refs.push(['content_scripts[' + i + '].css[' + j + ']', s]));
});

(m.web_accessible_resources || []).forEach((w, i) => {
  (w.resources || []).forEach((r, j) => {
    if (!r.includes('*')) refs.push(['web_accessible_resources[' + i + '][' + j + ']', r]);
  });
});

function walkIcons(o, p) {
  if (!o || typeof o !== 'object') return;
  for (const k of Object.keys(o)) {
    if (typeof o[k] === 'string' && /\.(png|svg|jpg)$/i.test(o[k])) refs.push([p + '.' + k, o[k]]);
    else if (typeof o[k] === 'object') walkIcons(o[k], p + '.' + k);
  }
}
walkIcons(m.icons, 'icons');
if (m.action) walkIcons(m.action.default_icon, 'action.default_icon');

let bad = 0;

refs.forEach(([label, p]) => {
  const ok = fs.existsSync(path.join(root, p));
  if (!ok) bad++;
  console.log((ok ? '  OK    ' : '  MISS  ') + label + ' -> ' + p);
});

const all = [];
(function scan(d) {
  fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const fp = path.join(d, e.name);
    if (e.isDirectory()) scan(fp);
    else all.push(path.relative(root, fp));
  });
})(root);

const reserved = all.filter((f) => path.basename(f).startsWith('_'));
console.log('  reserved "_" files: ' + (reserved.length ? reserved.join(', ') : 'none'));
if (reserved.length) bad += reserved.length;

const jsFiles = all.filter((f) => f.endsWith('.js'));
console.log('  js files: ' + jsFiles.length);

console.log(bad ? 'FAIL  ' + bad + ' problem(s)' : 'OK    manifest references complete, loadable');
process.exit(bad ? 1 : 0);
