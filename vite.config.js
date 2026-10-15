import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  base: './',                 // relative URLs so the build works under /eldritch-idle/ on Pages
  build: { outDir: '../dist', emptyOutDir: true },
  server: { port: 5173, host: true },   // host: reachable from a phone on the same Wi-Fi
  preview: { port: 4173, host: true },
  test: { environment: 'node' },        // core/ has no DOM; tests live next to it as *.test.js
});
