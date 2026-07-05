import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

function copyManifestPlugin() {
  return {
    name: 'copy-manifest',
    closeBundle() {
      const dist = resolve(__dirname, 'dist');
      mkdirSync(dist, { recursive: true });
      copyFileSync(resolve(__dirname, 'manifest.json'), resolve(dist, 'manifest.json'));
      const iconsDir = resolve(dist, 'icons');
      mkdirSync(iconsDir, { recursive: true });
      for (const size of [16, 32, 48, 128]) {
        const src = resolve(__dirname, `public/icons/icon-${size}.png`);
        if (existsSync(src)) {
          copyFileSync(src, resolve(iconsDir, `icon-${size}.png`));
        }
      }
      const logo = resolve(__dirname, 'public/logo.png');
      if (existsSync(logo)) {
        copyFileSync(logo, resolve(dist, 'logo.png'));
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), copyManifestPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        options: resolve(__dirname, 'options.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        background: resolve(__dirname, 'src/background/serviceWorker.ts'),
        content: resolve(__dirname, 'src/content/contentScript.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background') return 'background/serviceWorker.js';
          if (chunk.name === 'content') return 'content/contentScript.js';
          return 'assets/[name].js';
        },
        chunkFileNames: 'assets/chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
