// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // La dirección del sitio publicado. Hace falta para que las etiquetas og:
  // del layout salgan con la URL completa: WhatsApp no acepta rutas relativas
  // en og:image, necesita el https:// entero.
  site: 'https://baby-shower-maeliz-2026.vercel.app',

  vite: {
    plugins: [tailwindcss()]
  }
});
