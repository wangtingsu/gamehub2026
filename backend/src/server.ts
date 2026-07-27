import express from 'express';
import http from 'http';
import cors from 'cors';
import { connectDatabase } from './db';
import config from './config';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

async function start() {
  await connectDatabase();

  const routeList: [string, string][] = [
    ['/auth', './routes/auth.routes'],
    ['/auth', './routes/oauth.routes'],
    ['/users', './routes/user.routes'],
    ['/games', './routes/game.routes'],
    ['/news', './routes/news.routes'],
    ['/community', './routes/community.routes'],
    ['/upload', './routes/upload.routes'],
    ['/comments', './routes/comment.routes'],
    ['/search', './routes/search.routes'],
    ['/discovery', './routes/discovery.routes'],
    ['/about', './routes/about.routes'],
    ['/ai', './routes/ai.routes'],
    ['/guides', './routes/guide.routes'],
    ['/blogs', './routes/blog.routes'],
    ['/blog-spaces', './routes/blog-spaces.routes'],
    ['/admin', './routes/admin.routes'],
    ['/admin', './routes/admin-review.routes'],
    ['/admin', './routes/admin-recommend.routes'],
  ];

  for (const [path, modPath] of routeList) {
    try {
      const mod = await import(modPath);
      const router = (mod as any).default?.default || (mod as any).default || mod;
      app.use(config.apiPrefix + path, router);
    } catch (e: any) { console.log("Skip " + path + ": " + e.message); }
  }

  const port = config.port || 3001;
  http.createServer(app).listen(port, () => console.log('Backend on :' + port));
}
start().catch(e => { console.error(e); process.exit(1); });
