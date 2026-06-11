// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Statischer Output (Default). Die Seite läuft auf Vercel im Root,
// daher kein base-Pfad nötig – Runtime-Fetches gehen direkt auf /data/...
export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
