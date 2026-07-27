// Minimal startup - bypass module-level issues
import express from 'express';
import { connectDatabase } from '../src/db';
import config from '../src/config';
const app = express();
app.use(express.json());

async function main() {
  await connectDatabase();
  console.log('DB ready');

  // Load routes dynamically
  const { default: authRoutes } = await import('../src/routes/auth.routes');
  const { default: gameRoutes } = await import('../src/routes/game.routes');
  const { default: newsRoutes } = await import('../src/routes/news.routes');
  const { default: blogRoutes } = await import('../src/routes/blog.routes');
  // Don't load AI routes for now

  app.use(config.apiPrefix + '/auth', authRoutes);
  app.use(config.apiPrefix + '/games', gameRoutes);
  app.use(config.apiPrefix + '/news', newsRoutes);
  app.use(config.apiPrefix + '/blogs', blogRoutes);

  app.listen(3001, () => console.log('Backend on 3001'));
}
main().catch(e => { console.error(e); process.exit(1); });
