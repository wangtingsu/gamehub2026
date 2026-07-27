console.log('Test 1: starting');
import { connectDatabase } from '../src/db';
console.log('Test 2: imported');
connectDatabase().then(() => {
  console.log('Test 3: DB connected');
  process.exit(0);
}).catch((e: any) => {
  console.error('Test 3: DB ERROR', e.message);
  process.exit(1);
});
