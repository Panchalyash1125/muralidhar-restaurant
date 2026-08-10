require('dotenv').config();
const fs = require('fs');
const path = require('path');
const PostgresDb = require('../postgres-db');

async function main() {
  const db = new PostgresDb(process.env.DATABASE_URL);
  try {
    const schema = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'schema', 'schema.sql'), 'utf8');
    await db.exec(schema);
    console.log('✅ PostgreSQL schema is ready');
  } finally {
    await db.close();
  }
}

main().catch(err => {
  console.error('❌ PostgreSQL setup failed:', err.message);
  process.exit(1);
});
