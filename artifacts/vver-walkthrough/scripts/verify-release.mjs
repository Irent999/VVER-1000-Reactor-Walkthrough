import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(import.meta.dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

function fail(msg) {
  console.error(`[verify-release] ERROR: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(distDir) || !fs.existsSync(indexPath)) {
  fail('Папка dist/ или dist/index.html не найдена. Сначала выполните сборку (npm run build).');
}

const requiredFiles = [
  'assembly.glb',
  'favicon.svg',
  'draco/draco_decoder.js',
  'draco/draco_decoder.wasm',
  'draco/draco_wasm_wrapper.js',
];

for (const rel of requiredFiles) {
  const full = path.join(distDir, rel);
  if (!fs.existsSync(full) || fs.statSync(full).size === 0) {
    fail(`Отсутствует обязательный оффлайн-ассет в релизной сборке: dist/${rel}`);
  }
}

const html = fs.readFileSync(indexPath, 'utf8');

if (!html.includes('./assets/') || !html.includes('./favicon.svg')) {
  fail('В dist/index.html обнаружены неверные пути к ресурсам (ожидаются относительные ./assets/ и ./favicon.svg).');
}

if (/(?:src|href)=["']\/(?!\/)/i.test(html)) {
  fail('В dist/index.html остались жёсткие корневые пути вида "/...".');
}

const forbiddenCdns = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'www.gstatic.com/draco',
  'bolt.new/static',
];

const assetsDir = path.join(distDir, 'assets');
const filesToScan = [indexPath];
if (fs.existsSync(assetsDir)) {
  for (const name of fs.readdirSync(assetsDir)) {
    if (name.endsWith('.js') || name.endsWith('.css')) {
      filesToScan.push(path.join(assetsDir, name));
    }
  }
}

for (const filePath of filesToScan) {
  const content = fs.readFileSync(filePath, 'utf8');
  for (const cdn of forbiddenCdns) {
    if (content.includes(cdn)) {
      fail(`Обнаружена нежелательная внешняя CDN-зависимость "${cdn}" в ${path.basename(filePath)}.`);
    }
  }
  if (!path.basename(filePath).startsWith('vendor-') && content.includes('cdn.jsdelivr.net')) {
    fail(`Обнаружена внешняя ссылка cdn.jsdelivr.net в прикладном бандле ${path.basename(filePath)}.`);
  }
}

const glbSizeMB = (fs.statSync(path.join(distDir, 'assembly.glb')).size / (1024 * 1024)).toFixed(2);
console.info(`[verify-release] OK: dist/ готов к автономной упаковке (assembly.glb: ${glbSizeMB} МБ, относительные пути ./, без CDN).`);
