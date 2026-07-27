import('./src/routes/game.routes').then(m => {
  console.log('type:', typeof m.default);
  console.log('isFunc:', typeof m.default === 'function');
  process.exit(0);
}).catch((e: any) => { console.error(e.message); process.exit(1); });
