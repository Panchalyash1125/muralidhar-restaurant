/**
 * First-run launcher for Muralidhar Restaurant.
 * - Locally: if DATABASE_URL is missing, asks once for the Neon connection string
 *   and saves it to .env, then starts the server.
 * - Koyeb/CI: expects DATABASE_URL to be configured as an environment variable.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env');

require('dotenv').config({ path: ENV_FILE });

function isValidDatabaseUrl(value) {
  return /^postgres(?:ql)?:\/\//i.test(String(value || '').trim());
}

function writeEnv(databaseUrl) {
  let current = '';
  if (fs.existsSync(ENV_FILE)) current = fs.readFileSync(ENV_FILE, 'utf8');

  const lines = current
    .split(/\r?\n/)
    .filter(line => line.trim() && !/^DATABASE_URL\s*=/.test(line));

  const defaults = [
    'NODE_ENV=development',
    'PORT=3000',
    'HOST=0.0.0.0',
    'GST_RATE=0.05',
    'RATE_LIMIT_WINDOW_MS=900000',
    'RATE_LIMIT_MAX_REQUESTS=1000'
  ];

  for (const item of defaults) {
    const key = item.split('=')[0];
    if (!lines.some(line => line.startsWith(`${key}=`))) lines.push(item);
  }

  lines.push(`DATABASE_URL=${databaseUrl.trim()}`);
  fs.writeFileSync(ENV_FILE, `${lines.join('\n')}\n`, 'utf8');
  process.env.DATABASE_URL = databaseUrl.trim();
}

function startServer() {
  require('./server');
}

if (isValidDatabaseUrl(process.env.DATABASE_URL)) {
  startServer();
} else if (process.stdin.isTTY && process.stdout.isTTY) {
  console.log('\n=====================================================');
  console.log(' Muralidhar Restaurant - First Time Database Setup');
  console.log('=====================================================');
  console.log('DATABASE_URL is not configured yet.');
  console.log('Neon -> Project -> Connect -> copy Connection string.');
  console.log('Paste the FULL postgresql://... connection string below.');
  console.log('It will be saved locally in .env (do NOT upload .env to GitHub).\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Neon DATABASE_URL: ', answer => {
    rl.close();
    if (!isValidDatabaseUrl(answer)) {
      console.error('\nInvalid URL. It must start with postgresql:// or postgres://');
      console.error('Run npm start again and paste the Neon connection string.');
      process.exit(1);
    }

    try {
      writeEnv(answer);
      console.log('\nSaved .env successfully. Starting server...\n');
      startServer();
    } catch (error) {
      console.error('Could not save .env:', error.message);
      process.exit(1);
    }
  });
} else {
  console.error('DATABASE_URL is required.');
  console.error('Set DATABASE_URL in your hosting Environment Variables (for example, Koyeb).');
  process.exit(1);
}
