/**
 * ============================================
 * MURALIDHAR RESTAURANT - DATABASE SETUP (SAFE / NON-DESTRUCTIVE)
 * ============================================
 * Restores the ORIGINAL database schema (tables, orders, menu_items,
 * categories, order_items, users, sessions, otp_logs, activity_logs)
 * alongside the existing Restaurant Settings tables (settings, bills,
 * bill_items, payments).
 *
 * Safe to run on your CURRENT database:
 *   - Does NOT delete/reset restaurant.db
 *   - Uses CREATE TABLE IF NOT EXISTS everywhere
 *   - Only seeds data with INSERT OR IGNORE (won't touch existing rows
 *     in bills / bill_items / payments / settings)
 *
 * Run with:  node backend/database/setup.js
 * (or wherever you place this file inside backend/database/)
 * ============================================
 */

const fs = require('fs');
const path = require('path');

let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.error('❌ better-sqlite3 is not installed!');
  console.log('Please run: npm install');
  process.exit(1);
}

// Database path (matches backend/database/restaurant.db used by server.js)
const DB_DIR = path.join(__dirname);
const DB_PATH = path.join(DB_DIR, 'restaurant.db');

console.log('🍽️  Muralidhar Restaurant - Database Repair / Setup');
console.log('=====================================================\n');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log('✅ Created database directory');
}

const dbExisted = fs.existsSync(DB_PATH);
console.log(
  dbExisted
    ? `📦 Opening EXISTING database (data preserved): ${DB_PATH}`
    : `📦 Creating NEW database: ${DB_PATH}`
);

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
console.log('✅ Enabled WAL mode and foreign keys\n');

// ============================================
// FULL SCHEMA (idempotent — safe to re-run)
// ============================================
const schemaStatements = [

  // ---------- USERS (Admin & Staff) ----------
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'staff' CHECK(role IN ('admin', 'manager', 'staff', 'kitchen')),
    email VARCHAR(100),
    phone VARCHAR(15),
    is_active BOOLEAN NOT NULL DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // ---------- TABLES (Restaurant Tables) — used by Counter API ----------
  `CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_number INTEGER NOT NULL UNIQUE,
    capacity INTEGER NOT NULL DEFAULT 4,
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'reserved', 'cleaning')),
    qr_code_url TEXT,
    location VARCHAR(50),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // ---------- CATEGORIES (Menu Categories) ----------
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // ---------- MENU ITEMS ----------
  `CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    is_veg BOOLEAN NOT NULL DEFAULT 1,
    is_best_seller BOOLEAN NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT 1,
    preparation_time INTEGER DEFAULT 10,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
  )`,

  // ---------- ORDERS (Kitchen/Counter) ----------
  `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number VARCHAR(20) NOT NULL UNIQUE,
    table_id INTEGER NOT NULL,
    customer_name VARCHAR(60),
    customer_phone VARCHAR(15) NOT NULL,
    session_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled')),
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    gst_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    grand_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    special_instructions TEXT,
    estimated_time INTEGER,
    accepted_at DATETIME,
    prepared_at DATETIME,
    ready_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE RESTRICT
  )`,

  // ---------- ORDER ITEMS ----------
  `CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    menu_item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'preparing', 'ready', 'served')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT
  )`,

  // ---------- BILLS (already present, kept for completeness) ----------
  `CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_number VARCHAR(20) NOT NULL UNIQUE,
    table_id INTEGER NOT NULL,
    customer_name VARCHAR(60),
    customer_phone VARCHAR(15) NOT NULL,
    session_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'paid', 'closed')),
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    gst_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    grand_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
    opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE RESTRICT
  )`,

  // ---------- BILL ITEMS (already present, kept for completeness) ----------
  `CREATE TABLE IF NOT EXISTS bill_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    order_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT
  )`,

  // ---------- PAYMENTS (already present, kept for completeness) ----------
  `CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK(payment_method IN ('cash', 'card', 'upi', 'wallet')),
    transaction_id VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE RESTRICT
  )`,

  // ---------- OTP LOGS (Customer login) ----------
  `CREATE TABLE IF NOT EXISTS otp_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone VARCHAR(15) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    is_verified BOOLEAN NOT NULL DEFAULT 0,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // ---------- SESSIONS (Customer running-bill sessions) ----------
  `CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(50) NOT NULL UNIQUE,
    table_id INTEGER NOT NULL,
    customer_name VARCHAR(60),
    customer_phone VARCHAR(15) NOT NULL,
    bill_id INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE RESTRICT,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE SET NULL
  )`,

  // ---------- SETTINGS (Restaurant Settings feature — already present) ----------
  `CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key VARCHAR(50) NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // ---------- ACTIVITY LOGS (Audit trail) ----------
  `CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )`,

  // ---------- INDEXES ----------
  `CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bills_table ON bills(table_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status)`,
  `CREATE INDEX IF NOT EXISTS idx_bills_session ON bills(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id)`,
  `CREATE INDEX IF NOT EXISTS idx_menu_category ON menu_items(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_menu_available ON menu_items(is_available)`,
  `CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_logs(phone)`,
  `CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at)`,
];

console.log('📋 Applying schema (CREATE TABLE/INDEX IF NOT EXISTS)...');
let applied = 0;
for (const statement of schemaStatements) {
  try {
    db.exec(statement);
    applied++;
  } catch (err) {
    console.error(`❌ Schema error: ${err.message}`);
    console.error(`Statement: ${statement.substring(0, 80)}...`);
  }
}
console.log(`✅ Applied ${applied}/${schemaStatements.length} schema statements\n`);

// ============================================
// SAFE SEED DATA (INSERT OR IGNORE — won't touch existing rows)
// ============================================
console.log('🌱 Seeding baseline data (existing rows are left untouched)...');

const seedStatements = [
  `INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role, email, is_active)
   VALUES (1, 'admin', '$2a$10$YourHashedPasswordHere', 'Restaurant Admin', 'admin', 'admin@muralidhar.com', 1)`,

  `INSERT OR IGNORE INTO tables (id, table_number, capacity, status, location) VALUES
   (1, 1, 4, 'available', 'Main Hall - Table 1'),
   (2, 2, 4, 'available', 'Main Hall - Table 2'),
   (3, 3, 4, 'available', 'Main Hall - Table 3'),
   (4, 4, 4, 'available', 'Main Hall - Table 4'),
   (5, 5, 4, 'available', 'Main Hall - Table 5'),
   (6, 6, 4, 'available', 'Main Hall - Table 6'),
   (7, 7, 4, 'available', 'Main Hall - Table 7'),
   (8, 8, 4, 'available', 'Main Hall - Table 8'),
   (9, 9, 4, 'available', 'Main Hall - Table 9'),
   (10, 10, 4, 'available', 'Main Hall - Table 10'),
   (11, 11, 4, 'available', 'Main Hall - Table 11'),
   (12, 12, 4, 'available', 'Main Hall - Table 12')`,

  `INSERT OR IGNORE INTO categories (id, name, description, display_order) VALUES
   (1, 'Beverages', 'Hot and cold beverages', 1),
   (2, 'Breakfast', 'Morning breakfast items', 2),
   (3, 'Bread', 'Fresh breads and rotis', 3)`,

  `INSERT OR IGNORE INTO menu_items (id, category_id, name, description, price, image_url, is_veg, is_best_seller, is_available, preparation_time, display_order) VALUES
   (1, 1, 'Cha', 'Fresh Hot Tea brewed with premium Assam tea leaves, ginger, and cardamom.', 10.00, 'images/cha.jpg', 1, 1, 1, 5, 1),
   (2, 2, 'Poha', 'Fresh Gujarati Poha made with flattened rice, peanuts, curry leaves, and mustard seeds.', 30.00, 'images/poha.jpg', 1, 1, 1, 10, 1),
   (3, 3, 'Roti', 'Fresh Butter Roti made from whole wheat dough, cooked on tawa with pure desi ghee.', 15.00, 'images/roti.jpg', 1, 0, 1, 8, 1)`,

  `INSERT OR IGNORE INTO settings (key, value, description) VALUES
   ('restaurant_name', 'Muralidhar Restaurant', 'Restaurant display name'),
   ('gst_rate', '0.05', 'GST percentage (5%)'),
   ('currency', '₹', 'Currency symbol'),
   ('otp_expiry', '120', 'OTP expiry time in seconds'),
   ('otp_max_attempts', '3', 'Maximum OTP verification attempts'),
   ('default_preparation_time', '15', 'Default food preparation time in minutes'),
   ('theme_color', '#FF6B00', 'Primary theme color'),
   ('contact_phone', '+91 9876543210', 'Restaurant contact number'),
   ('address', 'Main Street, Gujarat, India', 'Restaurant address'),
   ('enable_demo_otp', 'true', 'Enable demo OTP for testing')`,
];

let seeded = 0;
for (const statement of seedStatements) {
  try {
    db.exec(statement);
    seeded++;
  } catch (err) {
    if (!err.message.includes('UNIQUE constraint failed')) {
      console.error(`❌ Seed error: ${err.message}`);
    }
  }
}
console.log(`✅ Executed ${seeded}/${seedStatements.length} seed statement groups\n`);

// ============================================
// VERIFY
// ============================================
console.log('🔍 Verifying tables...');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log(`Found ${tables.length} tables:`);
tables.forEach(t => console.log(`  • ${t.name}`));

const expected = [
  'users', 'tables', 'categories', 'menu_items', 'orders', 'order_items',
  'bills', 'bill_items', 'payments', 'otp_logs', 'sessions', 'settings', 'activity_logs',
];
const present = new Set(tables.map(t => t.name));
const stillMissing = expected.filter(t => !present.has(t));

if (stillMissing.length) {
  console.log(`\n⚠️  Still missing: ${stillMissing.join(', ')}`);
} else {
  console.log('\n✅ All original + settings tables are present.');
}

db.close();
console.log('\n✅ Database repair/setup complete. Restart your server (node backend/server.js).');
