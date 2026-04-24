import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        webcam: resolve(__dirname, 'webcam.html'),
        map: resolve(__dirname, 'map.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        chatbot: resolve(__dirname, 'chatbot.html'),
        defense: resolve(__dirname, 'defense.html'),
        feedback: resolve(__dirname, 'feedback.html'),
      },
    },
  },
  server: {
    port: 5173,
    open: '/',
  },
});
