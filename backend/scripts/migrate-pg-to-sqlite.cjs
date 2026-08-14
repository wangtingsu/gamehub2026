/**
 * PG → SQLite 数据迁移脚本
 *
 * 把生产 PostgreSQL 中的现有数据搬迁到 SQLite（better-sqlite3）。
 * 设计目标：
 *   - 自包含：自己先跑 migrations/*.sql 建出 SQLite 表结构，再逐表复制数据；
 *   - 类型安全：根据 PG 列类型做 bool→0/1、jsonb→TEXT、timestamptz→'YYYY-MM-DD HH:MM:SS' 等转换；
 *   - 幂等友好：只复制「有数据」的表；SQLite 中不存在的表/列会警告并跳过；
 *   - 保留自增 ID：插入显式主键，SQLite 会自动同步 sqlite_sequence。
 *
 * 用法（在一次性容器中，网络连到 gamehub-network，挂载 sqlite_data 卷）：
 *   docker run --rm -u 0 --network gamehub-network \
 *     -v /home/ubuntu/gamehub-2026/backend/scripts/migrate-pg-to-sqlite.cjs:/app/migrate.cjs:ro \
 *     -v gamehub-2026_sqlite_data:/app/data \
 *     -e PGHOST=postgres -e PGUSER=gamehub -e PGPASSWORD=<密码> -e PGDATABASE=gamehub \
 *     -e DB_PATH=/app/data/gamehub.db \
 *     --entrypoint node gamehub-2026-backend /app/migrate.cjs
 */

const { Client } = require('pg');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// ---------- 配置 ----------
const PG_CONFIG = {
  host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
  user: process.env.PGUSER || process.env.DB_USER || 'gamehub',
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'gamehub_password',
  database: process.env.PGDATABASE || process.env.DB_NAME || 'gamehub',
};

const backendDir = path.join(__dirname, '..');
const migrationsDir = path.join(backendDir, 'migrations');
const sqlitePath = process.env.DB_PATH
  ? (path.isAbsolute(process.env.DB_PATH) ? process.env.DB_PATH : path.join(backendDir, process.env.DB_PATH))
  : path.join(backendDir, 'data', 'gamehub.db');

// ---------- 工具函数 ----------
/** 给 SQL 标识符加双引号（表名/列名，防关键字冲突） */
function quoteIdent(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

/** 时间戳 → SQLite 常用的 'YYYY-MM-DD HH:MM:SS'（与 datetime('now') 同格式，保证日期比较一致） */
function toSqliteDatetime(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 19).replace('T', ' ');
  return String(v);
}

function toSqliteDate(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

/** 根据 PG 列类型把值转成 SQLite 可存储的形式 */
function coerce(value, udtName) {
  if (value === null || value === undefined) return null;
  switch (udtName) {
    case 'bool':
      return value ? 1 : 0;
    case 'json':
    case 'jsonb':
      return typeof value === 'string' ? value : JSON.stringify(value);
    case 'timestamp':
    case 'timestamptz':
      return toSqliteDatetime(value);
    case 'date':
      return toSqliteDate(value);
    case 'int2':
    case 'int4':
    case 'int8':
      return typeof value === 'string' ? Number(value) : value;
    case 'numeric':
    case 'decimal':
    case 'float4':
    case 'float8':
      return Number(value);
    default:
      // 数组类型（_text / _int4 等）
      if (udtName && udtName.startsWith('_')) {
        return typeof value === 'string' ? value : JSON.stringify(value);
      }
      // text / varchar / uuid / bytea 等：pg 已返回 string / Buffer
      return value;
  }
}

/** 在 SQLite 中跑 migrations/*.sql（与 src/db/sqlite.ts runMigrations 保持一致） */
function runSqliteMigrations(db) {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  const applied = new Set(
    db.prepare('SELECT migration_name FROM schema_migrations ORDER BY id ASC').all().map((r) => r.migration_name)
  );

  if (!fs.existsSync(migrationsDir)) {
    console.warn('⚠️  迁移目录不存在: ' + migrationsDir);
    return;
  }

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  const pending = files.filter((f) => !applied.has(f));

  for (const filename of pending) {
    const sqlContent = fs.readFileSync(path.join(migrationsDir, filename), 'utf-8');
    const statements = sqlContent
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const sql of statements) {
      const hasCode = sql.split('\n').some((l) => {
        const t = l.trim();
        return t !== '' && !t.startsWith('--');
      });
      if (!hasCode) continue;

      try {
        db.prepare(sql).run();
      } catch (e) {
        const msg = e.message || String(e);
        if (msg.includes('duplicate column name')) {
          console.warn(`  跳过重复列 (${filename})`);
          continue;
        }
        throw new Error(`迁移 ${filename} 失败: ${msg}\nSQL: ${sql.slice(0, 200)}`);
      }
    }

    db.prepare('INSERT INTO schema_migrations (migration_name) VALUES (?)').run(filename);
    console.log('  迁移完成: ' + filename);
  }
}

// ---------- 主流程 ----------
async function main() {
  console.log('=== PG → SQLite 数据迁移 ===');
  console.log('PG: ' + PG_CONFIG.host + ':' + PG_CONFIG.port + '/' + PG_CONFIG.database);
  console.log('SQLite: ' + sqlitePath);

  const pg = new Client(PG_CONFIG);
  await pg.connect();
  console.log('✅ 已连接 PostgreSQL\n');

  // 打开/创建 SQLite
  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
  const db = new Database(sqlitePath);
  db.pragma('foreign_keys = OFF'); // 导入期间关闭外键，避免表顺序问题
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  console.log('运行 SQLite 迁移...');
  runSqliteMigrations(db);
  console.log('');

  // 发现 PG 表
  const tables = (
    await pg.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    )
  ).rows.map((r) => r.table_name);

  const migrated = [];
  const skipped = [];
  let totalRows = 0;

  for (const table of tables) {
    if (table === 'schema_migrations') {
      console.log('⏭️  跳过 schema_migrations（SQLite 有独立的迁移记录）');
      continue;
    }

    // PG 列信息
    const colRes = await pg.query(
      `SELECT column_name, udt_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [table]
    );
    const pgCols = colRes.rows;

    // SQLite 列信息
    let sqliteCols;
    try {
      sqliteCols = db.prepare(`PRAGMA table_info(${quoteIdent(table)})`).all();
    } catch (e) {
      skipped.push(`${table}: SQLite 中不存在`);
      continue;
    }
    if (!sqliteCols.length) {
      skipped.push(`${table}: SQLite 中不存在`);
      continue;
    }
    const sqliteColSet = new Set(sqliteCols.map((c) => c.name));

    // 取公共列（保持 PG 顺序）
    const common = pgCols.filter((c) => sqliteColSet.has(c.column_name));
    if (!common.length) {
      skipped.push(`${table}: 无公共列`);
      continue;
    }

    // 读数据
    const { rows } = await pg.query(`SELECT * FROM ${quoteIdent(table)}`);
    if (!rows.length) continue; // 空表跳过（schema 已由迁移建好）

    // 构建插入
    const colNames = common.map((c) => quoteIdent(c.column_name));
    const insertSql = `INSERT INTO ${quoteIdent(table)} (${colNames.join(', ')}) VALUES (${common.map(() => '?').join(', ')})`;
    const stmt = db.prepare(insertSql);

    // 先清空该表的迁移种子数据（PG 为权威来源），确保 SQLite 与 PG 完全一致；
    // DELETE 与 INSERT 放在同一事务内，失败则整体回滚。
    const insertRows = db.transaction((dataRows) => {
      db.prepare(`DELETE FROM ${quoteIdent(table)}`).run();
      for (const row of dataRows) {
        stmt.run(...common.map((c) => coerce(row[c.column_name], c.udt_name)));
      }
    });
    insertRows(rows);

    migrated.push(`${table}: ${rows.length} 行`);
    totalRows += rows.length;
  }

  db.pragma('foreign_keys = ON');
  await pg.end();
  db.close();

  console.log('\n=== 迁移结果 ===');
  for (const m of migrated) console.log('✅ ' + m);
  if (skipped.length) {
    console.log('\n⚠️  跳过的表：');
    for (const s of skipped) console.log('   ' + s);
  }
  console.log(`\n共复制 ${migrated.length} 张表、${totalRows} 行数据。`);
  if (skipped.length) {
    console.log('提示：被跳过的表可能是不再使用的遗留表，或 SQLite schema 与 PG 存在差异，请人工核对。');
  }
}

main().catch((e) => {
  console.error('❌ 迁移失败:', e);
  process.exit(1);
});
