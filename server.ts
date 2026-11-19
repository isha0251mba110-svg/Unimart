import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiApp } from './server/app.ts';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  // Mount UNIMART Backend REST API
  app.use(apiApp);

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(rootDir, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[UNIMART] Full-stack server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('[UNIMART] Failed to start server:', err);
  process.exit(1);
});
