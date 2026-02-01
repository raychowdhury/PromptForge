import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Readable } from 'node:stream';

const hfProxy = () => ({
  name: 'hf-proxy',
  configureServer(server) {
    server.middlewares.use('/hf/', async (req, res) => {
      try {
        const rawUrl = req.originalUrl || req.url || '';
        const targetPath = rawUrl.replace(/^\/hf\//, '');
        const targetUrl = `https://huggingface.co/${targetPath}`;
        const upstream = await fetch(targetUrl, { redirect: 'follow' });
        res.statusCode = upstream.status;
        upstream.headers.forEach((value, key) => {
          if (key.toLowerCase() === 'content-encoding') return;
          res.setHeader(key, value);
        });
        res.setHeader('access-control-allow-origin', '*');
        if (upstream.body) {
          Readable.fromWeb(upstream.body).pipe(res);
        } else {
          res.end();
        }
      } catch (error) {
        res.statusCode = 502;
        res.end('HF proxy error');
      }
    });
  }
});

export default defineConfig({
  plugins: [react(), hfProxy()],
  server: {
    port: 5173
  }
});
