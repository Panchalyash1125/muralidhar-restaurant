const { Pool, types } = require('pg');

// Keep numbers behaving like the old SQLite driver.
types.setTypeParser(20, value => Number(value));   // int8 / COUNT(*)
types.setTypeParser(1700, value => Number(value)); // numeric / DECIMAL
const { AsyncLocalStorage } = require('async_hooks');

const txStorage = new AsyncLocalStorage();

function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function normalizeSql(sql) {
  let q = String(sql).trim();
  q = q.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
  q = q.replace(/\bis_available\s*=\s*1\b/gi, 'is_available = TRUE');
  q = q.replace(/\bis_active\s*=\s*1\b/gi, 'is_active = TRUE');
  q = q.replace(/\bis_best_seller\s*=\s*1\b/gi, 'is_best_seller = TRUE');
  q = q.replace(/\bis_active\s*=\s*0\b/gi, 'is_active = FALSE');
  return convertPlaceholders(q);
}

function normalizeParams(params) {
  return params.map(v => (v === undefined ? null : v));
}

class Statement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
  }

  async all(...params) {
    const result = await this.db.query(this.sql, params);
    return result.rows;
  }

  async get(...params) {
    const result = await this.db.query(this.sql, params);
    return result.rows[0];
  }

  async run(...params) {
    let sql = String(this.sql).trim();
    const isInsert = /^INSERT\s+/i.test(sql);
    const isInsertOrIgnore = /^INSERT\s+OR\s+IGNORE\s+/i.test(sql);
    if (isInsertOrIgnore && !/\bON\s+CONFLICT\b/i.test(sql)) {
      sql = sql.replace(/^INSERT\s+OR\s+IGNORE\s+/i, 'INSERT ');
      sql += ' ON CONFLICT DO NOTHING';
    }
    if (isInsert && !/\bRETURNING\b/i.test(sql)) {
      sql += ' RETURNING id';
    }
    const result = await this.db.query(sql, params);
    return {
      changes: result.rowCount,
      lastInsertRowid: result.rows && result.rows[0] ? result.rows[0].id : undefined
    };
  }
}

class PostgresDb {
  constructor(connectionString) {
    if (!connectionString) throw new Error('DATABASE_URL is required');
    this.pool = new Pool({
      connectionString,
      ssl: connectionString.includes('sslmode=') ? undefined : { rejectUnauthorized: false },
      max: Number(process.env.DB_POOL_MAX || 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
  }

  currentClient() {
    return txStorage.getStore() || this.pool;
  }

  async query(sql, params = []) {
    const q = normalizeSql(sql);
    return this.currentClient().query(q, normalizeParams(params));
  }

  prepare(sql) {
    return new Statement(this, sql);
  }

  async exec(sql) {
    return this.currentClient().query(String(sql));
  }

  transaction(fn) {
    return async (...args) => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const result = await txStorage.run(client, () => fn(...args));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    };
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = PostgresDb;
