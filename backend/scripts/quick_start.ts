import express from 'express';
import http from 'http';
import { connectDatabase } from '../src/db';
import config from '../src/config';

const app = express();
app.use(express.json({ limit: '10mb' }));

async function main() {
  await connectDatabase();

  // Load routes from index.ts exports
  const serverModule = await import('../src/index');
  const { default: serverApp, io } = serverModule as any;

  // Use the server from index.ts directly
  const server = http.createServer(serverApp || app);

  server.listen(config.port || 3001, () => {
    console.log('Server on port', config.port || 3001);
  });
}
main().catch(e => { console.error(e.message); process.exit(1); });
