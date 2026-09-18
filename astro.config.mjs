// @ts-check
import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';

// ═══════ ADELANTAR GSAP ═══════
// Astro deja en el HTML el script de cada componente, pero GSAP y ScrollTrigger
// viven en trozos aparte que esos scripts importan. El navegador recién se
// entera de que existen cuando ya bajó y leyó los scripts, así que van un viaje
// tarde: en un celular con señal normal el sobre de la portada se ve y late
// durante segundos sin responder al toque, porque el clic lo engancha GSAP.
//
// Esto recorre el HTML ya generado, sigue los imports de cada script y deja un
// <link rel="modulepreload"> por cada trozo compartido, para que el navegador
// los pida de entrada y no en cascada. Medido con la red de un celular
// (1,6 Mbps): el sobre pasa de responder a los 4,2 s a responder a los 2,2 s.
function adelantarModulos() {
  return {
    name: 'adelantar-modulos',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const raiz = fileURLToPath(dir);

        // de un archivo .js, los módulos que importa (solo los estáticos)
        const importaDe = (rutaJs) => {
          const codigo = fs.readFileSync(rutaJs, 'utf8');
          const salida = [];
          for (const m of codigo.matchAll(/(?:^|[;\s])import\s*(?:[^'"]*?from\s*)?["']([^"']+)["']/g)) {
            if (m[1].startsWith('.')) salida.push(m[1]);
          }
          return salida;
        };

        for (const archivo of fs.readdirSync(raiz, { recursive: true })) {
          if (typeof archivo !== 'string' || !archivo.endsWith('.html')) continue;
          const rutaHtml = path.join(raiz, archivo);
          let html = fs.readFileSync(rutaHtml, 'utf8');
          if (html.includes('rel="modulepreload"')) continue;

          // los scripts que el HTML ya trae
          const entradas = [...html.matchAll(/<script[^>]+src="(\/_astro\/[^"]+\.js)"/g)].map((m) => m[1]);

          // y todo lo que esos scripts arrastran, hacia abajo
          const vistos = new Set(entradas);
          const cola = [...entradas];
          const compartidos = new Set();
          while (cola.length) {
            const actual = cola.shift();
            const enDisco = path.join(raiz, actual.replace(/^\//, ''));
            if (!fs.existsSync(enDisco)) continue;
            for (const rel of importaDe(enDisco)) {
              const resuelto = '/' + path.posix.normalize(path.posix.join(path.posix.dirname(actual), rel)).replace(/^\//, '');
              if (vistos.has(resuelto)) continue;
              vistos.add(resuelto);
              compartidos.add(resuelto);
              cola.push(resuelto);
            }
          }

          if (!compartidos.size) continue;
          const links = [...compartidos].map((u) => `<link rel="modulepreload" href="${u}">`).join('');
          html = html.replace('</head>', links + '</head>');
          fs.writeFileSync(rutaHtml, html);
          logger.info(`modulepreload en ${archivo}: ${[...compartidos].join(', ')}`);
        }
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  // La dirección del sitio publicado. Hace falta para que las etiquetas og:
  // del layout salgan con la URL completa: WhatsApp no acepta rutas relativas
  // en og:image, necesita el https:// entero.
  site: 'https://baby-shower-maeliz-2026.vercel.app',

  integrations: [adelantarModulos()],

  vite: {
    plugins: [tailwindcss()]
  }
});
