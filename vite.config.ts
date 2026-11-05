import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'imora-public-html',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const page = bundle['index.html'];
      if (page?.type !== 'asset' || typeof page.source !== 'string') return;
      const shell = page.source.replace(/<!--public-content:start-->[\s\S]*?<!--public-content:end-->/, '')
        .replace('<meta name="robots" content="index,follow" />', '<meta name="robots" content="noindex,nofollow" />')
        .replace(/<title>.*?<\/title>/, '<title>Рабочее пространство | IMORA</title>')
        .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')
        .replace(/<link rel="canonical"[^>]*>/, '');
      this.emitFile({ type: 'asset', fileName: 'app.html', source: shell });
    },
    apply: 'build',
    transformIndexHtml(html, context) {
      if (!context.filename.endsWith('index.html')) return html;
      const body = readFileSync(new URL('./apps/landing/src/landing-v2-body.html', import.meta.url), 'utf8');
      const footer = readFileSync(new URL('./apps/landing/src/landing-v2-footer.html', import.meta.url), 'utf8');
      return html.replace('<div id="root"></div>', `<div id="root"><!--public-content:start--><div class="landing-v2" lang="uz">${body}<section id="demo" class="wrap"><h2>Demo so‘rash</h2><p>So‘rov formasidan foydalanish uchun JavaScript-ni yoqing.</p></section>${footer}</div><!--public-content:end--></div>`);
    },
  }],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
