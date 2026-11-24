import path from 'path';
import fs from 'fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

const port = Number(process.env.PORT) || 3000;

function aistudioAssetsFallbackPlugin(): Plugin {
  const localPublicDir = path.resolve(import.meta.dirname, 'public');
  const rootPublicDir = path.resolve(import.meta.dirname, '..', '..', 'public');

  const resolveFallbackPath = (cleanUrl: string): string | null => {
    const relPath = cleanUrl.replace(/^\/+/, '');
    const candidates = [
      path.join(rootPublicDir, relPath),
      ...(cleanUrl === '/assembly.glb'
        ? [
            path.join(rootPublicDir, 'assets', 'assembly.glb'),
            path.join(rootPublicDir, 'assets', 'aistudio', 'assembly.glb'),
            path.join(rootPublicDir, 'assets', 'aistudio', 'Сборка.glb'),
          ]
        : []),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    }
    return null;
  };

  const middleware = (
    req: { url?: string; method?: string },
    res: {
      writeHead: (status: number, headers: Record<string, string | number>) => void;
      end: () => void;
    } & NodeJS.WritableStream,
    next: () => void,
  ) => {
    if (!req.url) return next();
    const cleanUrl = decodeURIComponent(req.url.split('?')[0]);
    if (!cleanUrl.startsWith('/assets/aistudio/') && cleanUrl !== '/assembly.glb') {
      return next();
    }

    const relPath = cleanUrl.replace(/^\/+/, '');
    const localFile = path.join(localPublicDir, relPath);
    if (fs.existsSync(localFile) && fs.statSync(localFile).isFile()) {
      return next();
    }

    const fallbackFile = resolveFallbackPath(cleanUrl);
    if (fallbackFile) {
      const stat = fs.statSync(fallbackFile);
      const ext = path.extname(fallbackFile).toLowerCase();
      const mime =
        ext === '.glb'
          ? 'model/gltf-binary'
          : ext === '.gltf'
            ? 'model/gltf+json'
            : 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': stat.size,
        'Cache-Control': 'public, max-age=3600',
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      fs.createReadStream(fallbackFile).pipe(res);
      return;
    }
    return next();
  };

  return {
    name: 'aistudio-assets-fallback',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig(({ command }) => ({
  // В релизной сборке (vite build) по умолчанию используется относительный base: './',
  // чтобы приложение корректно запускалось из подпапки, локального сервера или оболочки установщика.
  base: process.env.BASE_PATH || (command === 'build' ? './' : '/'),
  plugins: [
    react(),
    tailwindcss(),
    aistudioAssetsFallbackPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei', '@react-three/xr'],
        },
      },
    },
  },
  server: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
}));
