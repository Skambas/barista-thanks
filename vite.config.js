import { defineConfig } from 'vite';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  envDir: '..',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2020',
    assetsInlineLimit: 0, // нічого не вшиваємо в base64: суворіший CSP
  },
  server: {
    host: true,
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' }, // dev: фрази з локального сервера
  },
  plugins: [
    compression({
      algorithms: ['gzip', 'brotliCompress'],
      exclude: [/\.(woff2|png|jpe?g|webp)$/i],
    }),
  ],
});
