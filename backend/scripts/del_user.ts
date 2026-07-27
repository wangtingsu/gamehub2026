import { connectDatabase, query, execute } from '../src/db';

async function main() {
  await connectDatabase();
  const users = await query('SELECT id, username, role FROM users WHERE username = ?', ['super_wangminchao']);
  console.log('Found:', JSON.stringify(users));
  if (users.length > 0) {
    await execute('DELETE FROM users WHERE username = ?', ['super_wangminchao']);
    console.log('已删除 super_wangminchao');
  } else {
    console.log('用户不存在');
  }
  process.exit(0);
}
main();
