/**
 * 对比本地 SQLite 和生产 PostgreSQL 表结构，生成差异 ALTER TABLE SQL
 * 用法: node scripts/sync-schema.js
 */
const Database = require('better-sqlite3');
const { execSync } = require('child_process');

// 1. 读取本地 SQLite schema
const db = new Database('./data/gamehub.db', { readonly: true });
const local = {};
const tables = db
  .prepare(
    `SELECT name FROM sqlite_material
     WHERE type='table'
       AND name NOT LIKE 'sqlite_%'
       AND name NOT LIKE '_prisma%'
       AND name != 'schema_migrations'
     ORDER BY name`
  )
  .all();

for (const t of tables) {
  const cols = db.prepare(`PRAGMA table_info("${t.name}")`).all();
  local[t.name] = {};
  for (const c of cols) {
    local[t.name][c.name] = c.type;
  }
}
db.close();

// 2. 读取线上 PostgreSQL schema (via SSH)
const pgOutput = execSync(
  `ssh -i ~/.ssh/temp_deploy -o StrictHostKeyChecking=no -o ConnectTimeout=10 ubuntu@43.128.56.249 "sudo docker exec gamehub-postgres psql -U gamehub -d gamehub -t -A -F'|' -c \\"SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position;\\""`,
  { encoding: 'utf8', timeout: 15000 }
);

const remote = {};
for (const line of pgOutput.trim().split('\n')) {
  const [table, col] = line.split('|');
  if (!table || !col) continue;
  if (!remote[table]) remote[table] = {};
  remote[table][col] = true;
}

// 3. 对比并生成 SQL
const sql = [];
let count = 0;

for (const [table, cols] of Object.entries(local)) {
  if (!remote[table]) {
    console.log(`-- ⚠️ 表 ${table} 在线上不存在，跳过`);
    continue;
  }
  for (const [col, type] of Object.entries(cols)) {
    if (!remote[table][col]) {
      // SQLite type → PostgreSQL type
      let pgType = 'TEXT';
      if (type.includes('INT') || type === 'INTEGER') pgType = 'INTEGER';
      else if (type.includes('REAL') || type.includes('FLOAT')) pgType = 'REAL';
      else if (type.includes('BOOL')) pgType = 'BOOLEAN DEFAULT false';

      const nullable = type.toUpperCase().includes('NOT NULL') ? 'NOT NULL' : '';
      const defVal = type.toUpperCase().includes('DEFAULT') ? '' : '';

      sql.push(
        `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${pgType};`
      );
      count++;
    }
  }
}

if (count === 0) {
  console.log('✅ 表结构完全一致，无需同步');
} else {
  console.log(`-- ${count} 个缺失列:\n`);
  console.log(sql.join('\n'));
}
