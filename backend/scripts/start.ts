// Minimal startup
import { connectDatabase } from '../src/db';
import config from '../src/config';

async function main() {
  await connectDatabase();
  // Import index.ts fully - but don't let its module-level code run
  const idx = await import('../src/index');
  // The app is already started by index.ts module code
  console.log('Backend started');
}
main().catch(e => { console.error(e); process.exit(1); });
