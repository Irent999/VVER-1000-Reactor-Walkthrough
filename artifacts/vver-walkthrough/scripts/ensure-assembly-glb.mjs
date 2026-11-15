import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const TARGET_PATH = path.resolve(import.meta.dirname, '..', 'public', 'assembly.glb');
const TEMP_PATH = `${TARGET_PATH}.download`;

const CANDIDATE_URLS = [
  process.env.ASSEMBLY_GLB_URL,
  'https://raw.githubusercontent.com/Irent999/VVER-1000-Reactor-Walkthrough/main/artifacts/vver-walkthrough/public/assembly.glb',
  'https://raw.githubusercontent.com/Irent999/VVER-1000-Reactor-Walkthrough/main/public/assembly.glb',
  'https://github.com/Irent999/VVER-1000-Reactor-Walkthrough/raw/main/artifacts/vver-walkthrough/public/assembly.glb',
  'https://github.com/Irent999/VVER-1000-Reactor-Walkthrough/raw/main/public/assembly.glb',
].filter(Boolean);

function hasValidGlbOnDisk(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size === 0) return false;
    const fd = fs.openSync(filePath, 'r');
    const header = Buffer.alloc(4);
    fs.readSync(fd, header, 0, 4, 0);
    fs.closeSync(fd);
    return header.toString('ascii') === 'glTF';
  } catch {
    return false;
  }
}

function downloadWithRedirects(url, destPath, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'vver-walkthrough-asset-sync',
      Accept: 'application/octet-stream, */*',
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const req = https.get(url, { headers, timeout: 20000 }, (res) => {
      const status = res.statusCode ?? 0;

      if (status >= 300 && status < 400 && res.headers.location && redirectsLeft > 0) {
        const nextUrl = new URL(res.headers.location, url).toString();
        res.resume();
        downloadWithRedirects(nextUrl, destPath, redirectsLeft - 1).then(resolve, reject);
        return;
      }

      if (status !== 200) {
        res.resume();
        reject(new Error(`HTTP ${status}`));
        return;
      }

      const contentType = String(res.headers['content-type'] || '').toLowerCase();
      if (contentType.includes('text/html')) {
        res.resume();
        reject(new Error(`Unexpected Content-Type: ${contentType}`));
        return;
      }

      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      const fileStream = fs.createWriteStream(destPath);
      const totalBytes = Number(res.headers['content-length'] || 0);
      let downloadedBytes = 0;
      let nextLogMB = 10;

      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const mb = downloadedBytes / (1024 * 1024);
        if (mb >= nextLogMB) {
          nextLogMB += 10;
          const totalLabel = totalBytes > 0 ? ` / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB` : '';
          console.info(`[ensure-assembly] Downloading assembly.glb: ${mb.toFixed(1)} MB${totalLabel}`);
        }
      });

      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(() => resolve(downloadedBytes));
      });

      fileStream.on('error', (err) => {
        res.destroy();
        reject(err);
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Request timed out'));
    });

    req.on('error', reject);
  });
}

async function main() {
  if (hasValidGlbOnDisk(TARGET_PATH)) {
    const sizeMB = (fs.statSync(TARGET_PATH).size / (1024 * 1024)).toFixed(2);
    console.info(`[ensure-assembly] public/assembly.glb is present (${sizeMB} MB).`);
    return;
  }

  console.info('[ensure-assembly] public/assembly.glb missing or empty. Fetching from GitHub...');

  for (const url of CANDIDATE_URLS) {
    try {
      const bytes = await downloadWithRedirects(url, TEMP_PATH);
      if (bytes > 0 && hasValidGlbOnDisk(TEMP_PATH)) {
        fs.renameSync(TEMP_PATH, TARGET_PATH);
        console.info(
          `[ensure-assembly] Downloaded public/assembly.glb (${(bytes / (1024 * 1024)).toFixed(2)} MB) from ${url}`
        );
        return;
      }

      // Check if GitHub returned a Git LFS pointer text file instead of binary GLB
      const preview = fs.readFileSync(TEMP_PATH, 'utf8').slice(0, 160);
      fs.rmSync(TEMP_PATH, { force: true });
      if (preview.includes('https://git-lfs.github.com/spec/v1')) {
        const mediaUrl = url
          .replace('https://raw.githubusercontent.com/', 'https://media.githubusercontent.com/media/')
          .replace('/raw/main/', '/media/main/');
        if (mediaUrl !== url) {
          console.info(`[ensure-assembly] Git LFS pointer detected; trying media endpoint: ${mediaUrl}`);
          const lfsBytes = await downloadWithRedirects(mediaUrl, TEMP_PATH);
          if (lfsBytes > 0 && hasValidGlbOnDisk(TEMP_PATH)) {
            fs.renameSync(TEMP_PATH, TARGET_PATH);
            console.info(
              `[ensure-assembly] Downloaded public/assembly.glb via LFS (${(lfsBytes / (1024 * 1024)).toFixed(2)} MB)`
            );
            return;
          }
          fs.rmSync(TEMP_PATH, { force: true });
        }
      } else {
        console.warn(`[ensure-assembly] Downloaded file from ${url} is not a valid binary glTF (.glb).`);
      }
    } catch (err) {
      fs.rmSync(TEMP_PATH, { force: true });
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[ensure-assembly] Skipping ${url} (${msg})`);
    }
  }

  console.warn(
    '[ensure-assembly] Could not download assembly.glb automatically. If https://github.com/Irent999/VVER-1000-Reactor-Walkthrough is private, set GITHUB_TOKEN or make the repo/asset URL public.'
  );
}

main().catch((err) => {
  fs.rmSync(TEMP_PATH, { force: true });
  console.warn('[ensure-assembly] Asset sync warning:', err instanceof Error ? err.message : String(err));
});
