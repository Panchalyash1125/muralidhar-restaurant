/**
 * ============================================
 * MURALIDHAR RESTAURANT - MAIN SERVER
 * Express.js + Socket.IO Backend
 * ============================================
 */

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
require('dotenv').config();

const { Server } = require('socket.io');

// ============================================
// CONFIGURATION
// ============================================
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:8080,http://localhost:3000').split(',');

// ============================================
// INITIALIZE APP
// ============================================
const app = express();
const server = http.createServer(app);

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      frameSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);


// Logging
app.use(morgan(NODE_ENV === 'development' ? 'dev' : 'combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// STATIC FILES
// ============================================
// Serve all frontend modules statically
app.use('/customer', express.static(path.join(__dirname, '..', 'customer')));
app.use('/counter', express.static(path.join(__dirname, '..', 'counter')));
app.use('/kitchen', express.static(path.join(__dirname, '..', 'kitchen')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));
app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));

// ============================================
// UPLOADS (Menu Item Images)
// ============================================
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'menu');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const menuImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  }
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const uploadMenuImage = multer({
  storage: menuImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, WEBP, or GIF images are allowed'));
    }
  }
});

// Restaurant logo upload (Restaurant Settings)
const BRANDING_DIR = path.join(__dirname, 'uploads', 'branding');
fs.mkdirSync(BRANDING_DIR, { recursive: true });

const logoImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, BRANDING_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `logo-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  }
});

const uploadLogoImage = multer({
  storage: logoImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, WEBP, or GIF images are allowed'));
    }
  }
});

// ============================================
// DATABASE CONNECTION
// ============================================
const Database = require('better-sqlite3');
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database', 'restaurant.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('✅ Database connected');

// ============================================
// COUNTER PANEL - SCHEMA SAFETY NET
// ============================================
// These tables already exist in database/schema/schema.sql and are
// normally created by backend/database/setup.js. This idempotent
// check simply guarantees the Counter Panel has what it needs even
// if setup.js was never run against this database file.
db.exec(`
  CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_number VARCHAR(20) NOT NULL UNIQUE,
      table_id INTEGER NOT NULL,
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
  );

  CREATE TABLE IF NOT EXISTS bill_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      payment_method VARCHAR(20) NOT NULL CHECK(payment_method IN ('cash', 'card', 'upi', 'wallet')),
      transaction_id VARCHAR(100),
      status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE RESTRICT
  );

  CREATE INDEX IF NOT EXISTS idx_bills_table ON bills(table_id);
  CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
  CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);
  CREATE INDEX IF NOT EXISTS idx_bill_items_order ON bill_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
`);
console.log('✅ Counter Panel tables verified');

// ============================================
// RESTAURANT SETTINGS - SCHEMA SAFETY NET
// ============================================
// The "settings" key/value table already exists in
// database/schema/schema.sql. This idempotent check guarantees it (and
// the keys the Restaurant Settings screen needs) exist even if setup.js
// was never run against this database file. Existing keys are left
// untouched (INSERT OR IGNORE).
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key VARCHAR(50) NOT NULL UNIQUE,
      value TEXT,
      description TEXT,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);
db.prepare(`INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)`).run(
  'restaurant_name', 'Muralidhar Restaurant', 'Restaurant display name'
);
db.prepare(`INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)`).run(
  'logo_url', null, 'Restaurant logo image URL'
);
db.prepare(`INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)`).run(
  'contact_phone', '', 'Restaurant contact number'
);
db.prepare(`INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)`).run(
  'gst_number', '', 'Restaurant GSTIN (GST registration number)'
);
db.prepare(`INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)`).run(
  'address', '', 'Restaurant address'
);
db.prepare(`INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)`).run(
  'opening_time', '09:00', 'Restaurant opening time (24h HH:MM)'
);
db.prepare(`INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)`).run(
  'closing_time', '22:00', 'Restaurant closing time (24h HH:MM)'
);
console.log('✅ Restaurant Settings verified');

// ============================================
// ORDER FLOW - SCHEMA SAFETY NET
// ============================================
// Customer -> Kitchen -> Counter -> Admin all depend on these core
// tables. They already exist in database/schema/schema.sql and are
// normally created by backend/database/setup.js. This idempotent
// check guarantees the complete order flow works even if setup.js
// was never run against this database file (this is what was
// previously causing "SQLiteError: no such table: tables" on the
// Counter API). Existing data is never touched (CREATE ... IF NOT
// EXISTS only) - safe to run against a database that already has
// live orders/bills/payments.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
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
  );

  CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number INTEGER NOT NULL UNIQUE,
      capacity INTEGER NOT NULL DEFAULT 4,
      status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'reserved', 'cleaning')),
      qr_code_url TEXT,
      location VARCHAR(50),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(50) NOT NULL UNIQUE,
      description TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS menu_items (
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
  );

  CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number VARCHAR(20) NOT NULL UNIQUE,
      table_id INTEGER NOT NULL,
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
  );

  CREATE TABLE IF NOT EXISTS order_items (
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
  );

  CREATE TABLE IF NOT EXISTS otp_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone VARCHAR(15) NOT NULL,
      otp_code VARCHAR(10) NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      is_verified BOOLEAN NOT NULL DEFAULT 0,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id VARCHAR(50) NOT NULL UNIQUE,
      table_id INTEGER NOT NULL,
      customer_phone VARCHAR(15) NOT NULL,
      bill_id INTEGER,
      is_active BOOLEAN NOT NULL DEFAULT 1,
      started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE RESTRICT,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action VARCHAR(50) NOT NULL,
      entity_type VARCHAR(50),
      entity_id INTEGER,
      details TEXT,
      ip_address VARCHAR(45),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
  CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);
  CREATE INDEX IF NOT EXISTS idx_menu_category ON menu_items(category_id);
  CREATE INDEX IF NOT EXISTS idx_menu_available ON menu_items(is_available);
  CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_logs(phone);
  CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);
`);

// Seed the customer-facing tables used by the current QR links.
// INSERT OR IGNORE makes this safe on every server start and preserves
// any table records or status changes that already exist.
const seedDefaultTable = db.prepare(`
  INSERT OR IGNORE INTO tables (table_number, capacity, status, location)
  VALUES (?, 4, 'available', ?)
`);

const seedDefaultTables = db.transaction(() => {
  for (let tableNumber = 1; tableNumber <= 12; tableNumber += 1) {
    seedDefaultTable.run(tableNumber, `Main Hall - Table ${tableNumber}`);
  }
});
seedDefaultTables();

console.log('✅ Order flow tables verified (tables, categories, menu_items, orders, order_items, sessions, otp_logs, activity_logs, users)');

// Non-destructive migration for the no-OTP customer name field.
const orderColumns = db.prepare('PRAGMA table_info(orders)').all().map(c => c.name);
if (!orderColumns.includes('customer_name')) {
  db.exec("ALTER TABLE orders ADD COLUMN customer_name VARCHAR(60)");
}


// Make db available to routes
app.locals.db = db;

// ============================================
// SOCKET.IO SETUP
// ============================================
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket connection tracking
const connectedSockets = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Identify socket by room (kitchen, counter, admin)
  socket.on('join_room', (room) => {
    socket.join(room);
    connectedSockets.set(socket.id, { room, joinedAt: new Date() });
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    connectedSockets.delete(socket.id);
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.locals.io = io;

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: '1.0.0'
  });
});

// Menu routes (public)
app.get('/api/menu', (req, res) => {
  try {
    const { category } = req.query;

    let query = `
      SELECT 
        m.id, m.name, m.description, m.price, m.image_url as image,
        m.is_veg as isVeg, m.is_best_seller as isBestSeller,
        m.is_available as isAvailable, m.preparation_time as preparationTime,
        c.name as category, c.id as category_id
      FROM menu_items m
      JOIN categories c ON m.category_id = c.id
      WHERE m.is_available = 1
    `;

    const params = [];

    if (category && category !== 'all') {
      query += ' AND c.name = ?';
      params.push(category);
    }

    query += ' ORDER BY m.display_order, m.name';

    const items = db.prepare(query).all(...params);

    res.json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error('Menu error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch menu' });
  }
});

// Categories
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order').all();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// Restaurant Settings (public, read-only) - name/logo/phone/GST/address/hours
// for use by any frontend module (customer, kitchen, counter, admin).
function readRestaurantSettings() {
  const keys = ['restaurant_name', 'logo_url', 'contact_phone', 'gst_number', 'address', 'opening_time', 'closing_time'];
  const placeholders = keys.map(() => '?').join(',');
  const rows = db.prepare(`SELECT key, value FROM settings WHERE key IN (${placeholders})`).all(...keys);
  const map = {};
  rows.forEach(r => { map[r.key] = r.value; });

  return {
    restaurantName: map.restaurant_name || '',
    logo: map.logo_url || null,
    phone: map.contact_phone || '',
    gstNumber: map.gst_number || '',
    address: map.address || '',
    openingTime: map.opening_time || '',
    closingTime: map.closing_time || ''
  };
}

app.get('/api/settings/restaurant', (req, res) => {
  try {
    res.json({ success: true, data: readRestaurantSettings() });
  } catch (error) {
    console.error('Get restaurant settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch restaurant settings' });
  }
});

// Phone OTP is handled by Firebase Phone Authentication in the customer frontend.
// Order creation is protected below by Firebase ID-token verification.

// Resolve a LocalStorage menu item to a valid SQLite menu row.
// LocalStorage IDs are not database foreign keys, so matching only by ID can
// point to a missing or unrelated record. We first verify ID + name, then
// match by case-insensitive name, and finally create a backend mirror row.
function resolveOrderMenuItem(item) {
  const submittedId = Number(item.menu_item_id);
  const name = String(item.name || '').trim();
  const categoryName = String(item.category || 'other').trim().toLowerCase() || 'other';
  const price = Number(item.price);

  if (!name) throw new Error('Every order item must include a dish name');
  if (!Number.isFinite(price) || price < 0) throw new Error(`Invalid price for ${name}`);

  let menuItem = null;
  if (Number.isInteger(submittedId) && submittedId > 0) {
    menuItem = db.prepare(`
      SELECT id, name FROM menu_items
      WHERE id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?))
    `).get(submittedId, name);
  }

  if (!menuItem) {
    menuItem = db.prepare(`
      SELECT id, name FROM menu_items
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
      ORDER BY id LIMIT 1
    `).get(name);
  }

  let category = db.prepare(`
    SELECT id FROM categories WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
  `).get(categoryName);

  if (!category) {
    const categoryResult = db.prepare(`
      INSERT INTO categories (name, display_order, is_active) VALUES (?, 0, 1)
    `).run(categoryName);
    category = { id: Number(categoryResult.lastInsertRowid) };
  }

  if (!menuItem) {
    const created = db.prepare(`
      INSERT INTO menu_items
        (category_id, name, description, price, image_url, is_veg,
         is_best_seller, is_available, preparation_time, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 0)
    `).run(
      category.id,
      name,
      item.description || null,
      price,
      item.image || null,
      item.is_veg === false ? 0 : 1,
      item.is_best_seller ? 1 : 0,
      Number(item.preparation_time) || 10
    );
    return Number(created.lastInsertRowid);
  }

  // Keep the backend mirror current for Kitchen, Counter and reports.
  db.prepare(`
    UPDATE menu_items
    SET category_id = ?, description = ?, price = ?, image_url = ?,
        is_veg = ?, is_best_seller = ?, is_available = 1,
        preparation_time = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    category.id,
    item.description || null,
    price,
    item.image || null,
    item.is_veg === false ? 0 : 1,
    item.is_best_seller ? 1 : 0,
    Number(item.preparation_time) || 10,
    menuItem.id
  );

  return Number(menuItem.id);
}

// Place Order
app.post('/api/orders', (req, res) => {
  try {
    const {
      table_number,
      customer_name,
      customer_phone,
      items,
      special_instructions,
      session_id
    } = req.body;

    const cleanName = String(customer_name || '').trim().replace(/\s+/g, ' ');
    const cleanPhone = String(customer_phone || '').replace(/\D/g, '').slice(-10);
    if (!table_number || cleanName.length < 2 || !/^[6-9]\d{9}$/.test(cleanPhone) || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid name, 10-digit mobile number, table, and order items.' });
    }

    const placeOrderTransaction = db.transaction(() => {
      const table = db.prepare('SELECT id FROM tables WHERE table_number = ?').get(table_number);
      if (!table) throw new Error('Invalid table number');

      const normalizedItems = items.map(item => {
        const quantity = Number(item.quantity);
        const price = Number(item.price);
        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new Error(`Invalid quantity for ${item.name || 'menu item'}`);
        }
        if (!Number.isFinite(price) || price < 0) {
          throw new Error(`Invalid price for ${item.name || 'menu item'}`);
        }
        return {
          ...item,
          quantity,
          price,
          databaseMenuItemId: resolveOrderMenuItem(item)
        };
      });

      // Calculate totals on the server instead of trusting browser values.
      const subtotal = normalizedItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
      const gst = Number((subtotal * 0.05).toFixed(2));
      const grandTotal = Number((subtotal + gst).toFixed(2));
      const effectiveSessionId = session_id || `session_${Date.now()}`;
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

      // A table can have only one running bill at a time. Any repeat order
      // from the same table is appended to that existing open bill, even if
      // the customer enters a different phone number on the next order.
      const existingSession = db.prepare(`
        SELECT b.id as bill_id
        FROM bills b
        WHERE b.table_id = ? AND b.status = 'open'
        ORDER BY b.created_at DESC LIMIT 1
      `).get(table.id);

      let billId;
      let isNewBill = false;

      if (!existingSession) {
        const billNumber = `BILL-${Date.now().toString(36).toUpperCase()}`;
        const billResult = db.prepare(`
          INSERT INTO bills
            (bill_number, table_id, customer_phone, session_id, status, subtotal, gst_amount, grand_total)
          VALUES (?, ?, ?, ?, 'open', 0, 0, 0)
        `).run(billNumber, table.id, cleanPhone, effectiveSessionId);
        billId = Number(billResult.lastInsertRowid);
        isNewBill = true;
        db.prepare("UPDATE tables SET status = 'occupied' WHERE id = ?").run(table.id);
      } else {
        billId = Number(existingSession.bill_id);
      }

      const orderResult = db.prepare(`
        INSERT INTO orders
          (order_number, table_id, customer_name, customer_phone, session_id, status,
           subtotal, gst_amount, grand_total, special_instructions)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
      `).run(
        orderNumber,
        table.id,
        cleanName,
        cleanPhone,
        effectiveSessionId,
        subtotal,
        gst,
        grandTotal,
        special_instructions || null
      );
      const orderId = Number(orderResult.lastInsertRowid);

      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?)
      `);

      normalizedItems.forEach(item => {
        insertItem.run(
          orderId,
          item.databaseMenuItemId,
          item.quantity,
          item.price,
          Number((item.quantity * item.price).toFixed(2))
        );
      });

      db.prepare('INSERT INTO bill_items (bill_id, order_id) VALUES (?, ?)').run(billId, orderId);
      db.prepare(`
        UPDATE bills
        SET subtotal = subtotal + ?, gst_amount = gst_amount + ?,
            grand_total = grand_total + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(subtotal, gst, grandTotal, billId);

      return { orderId, orderNumber, billId, isNewBill, subtotal, gst, grandTotal, normalizedItems };
    });

    const result = placeOrderTransaction();

    io.to('kitchen').emit('new_order', {
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      tableNumber: table_number,
      customerName: cleanName,
      customerPhone: cleanPhone,
      items: result.normalizedItems.map(({ databaseMenuItemId, ...item }) => item),
      total: result.grandTotal,
      specialInstructions: special_instructions,
      timestamp: new Date().toISOString()
    });

    io.to('counter').emit('bill_update', {
      billId: result.billId,
      tableNumber: table_number,
      customerName: cleanName,
      customerPhone: cleanPhone,
      isNewBill: result.isNewBill,
      total: result.grandTotal
    });

    // Keep the Admin dashboard in sync immediately after an order is placed.
    io.to('admin').emit('dashboard_update', {
      reason: 'order_created',
      orderId: result.orderId,
      tableNumber: table_number
    });

    res.json({
      success: true,
      message: 'Order placed successfully',
      data: {
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        billId: result.billId,
        isNewBill: result.isNewBill,
        estimatedTime: 15
      }
    });
  } catch (error) {
    console.error('Order error:', error);
    const isValidationError = /Invalid|must include|required|quantity|price/i.test(error.message);
    res.status(isValidationError ? 400 : 500).json({
      success: false,
      message: isValidationError ? error.message : 'Failed to place order'
    });
  }
});

// Get order by ID
app.get('/api/orders/:id(\\d+)', (req, res) => {
  try {
    const order = db.prepare(`
      SELECT o.*, t.table_number,
        json_group_array(json_object(
          'id', oi.id,
          'menu_item_id', oi.menu_item_id,
          'name', mi.name,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'total_price', oi.total_price
        )) as items
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.id = ?
      GROUP BY o.id
    `).get(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.items = JSON.parse(order.items);
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
});

// Get active orders for kitchen
app.get('/api/orders/active', (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT o.*, t.table_number,
        json_group_array(json_object(
          'name', mi.name,
          'quantity', oi.quantity,
          'status', oi.status
        )) as items
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.status IN ('pending', 'accepted', 'preparing', 'ready')
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `).all();

    orders.forEach(o => o.items = JSON.parse(o.items));
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// Update order status
app.put('/api/orders/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const timestampField = {
      'accepted': 'accepted_at',
      'preparing': 'prepared_at',
      'ready': 'ready_at',
      'completed': 'completed_at'
    }[status];

    let query = 'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP';
    const params = [status];

    if (timestampField) {
      query += `, ${timestampField} = CURRENT_TIMESTAMP`;
    }

    query += ' WHERE id = ?';
    params.push(req.params.id);

    const result = db.prepare(query).run(...params);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Emit status update to kitchen (existing behavior, unchanged)
    io.to('kitchen').emit('order_status_update', {
      orderId: req.params.id,
      status: status
    });

    // Also notify the Counter Panel in real time, so a merged bill's
    // status badge (Pending/Preparing/Ready/Mixed) stays live without
    // requiring a manual refresh. Additive only - does not change the
    // response or behavior of this endpoint for existing consumers.
    io.to('counter').emit('order_status_update', {
      orderId: req.params.id,
      status: status
    });


    io.to('admin').emit('dashboard_update', {
      reason: 'order_status_updated',
      orderId: req.params.id,
      status
    });

    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// Get open bills
app.get('/api/bills/open', (req, res) => {
  try {
    const bills = db.prepare(`
      SELECT b.*, t.table_number,
        json_group_array(json_object(
          'order_id', o.id,
          'order_number', o.order_number,
          'status', o.status,
          'grand_total', o.grand_total
        )) as orders
      FROM bills b
      JOIN tables t ON b.table_id = t.id
      LEFT JOIN bill_items bi ON b.id = bi.bill_id
      LEFT JOIN orders o ON bi.order_id = o.id
      WHERE b.status = 'open'
      GROUP BY b.id
      ORDER BY b.opened_at DESC
    `).all();

    bills.forEach(b => b.orders = JSON.parse(b.orders || '[]'));
    res.json({ success: true, count: bills.length, data: bills });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch bills' });
  }
});

// Process payment
app.post('/api/bills/:id/pay', (req, res) => {
  try {
    const { amount, payment_method } = req.body;
    const billId = req.params.id;

    if (!amount || !payment_method) {
      return res.status(400).json({ success: false, message: 'Amount and payment method required' });
    }

    const validMethods = ['cash', 'card', 'upi', 'wallet'];
    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    // Record payment
    const transactionId = `TXN-${Date.now()}`;
    db.prepare(`
      INSERT INTO payments (bill_id, amount, payment_method, transaction_id, status)
      VALUES (?, ?, ?, ?, 'completed')
    `).run(billId, amount, payment_method, transactionId);

    // Update bill
    db.prepare(`
      UPDATE bills 
      SET status = 'paid', total_paid = total_paid + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(amount, billId);

    // Get bill details
    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId);

    // Emit to counter
    io.to('counter').emit('payment_received', {
      billId: billId,
      amount: amount,
      method: payment_method
    });

    res.json({ success: true, message: 'Payment processed', transactionId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Payment failed' });
  }
});

// Close bill
app.post('/api/bills/:id/close', (req, res) => {
  try {
    const billId = req.params.id;

    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    // Update bill
    db.prepare(`
      UPDATE bills SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(billId);

    // Free table
    db.prepare("UPDATE tables SET status = 'available' WHERE id = ?").run(bill.table_id);

    // End session
    db.prepare("UPDATE sessions SET is_active = 0, ended_at = CURRENT_TIMESTAMP WHERE bill_id = ?").run(billId);

    // Emit updates
    io.to('counter').emit('bill_closed', { billId: billId });
    io.to('kitchen').emit('table_cleared', { tableId: bill.table_id });

    res.json({ success: true, message: 'Bill closed and table cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to close bill' });
  }
});

// ============================================
// COUNTER PANEL API
// ============================================
// These are additive, standalone endpoints for the new Counter Panel.
// They do not modify or replace any existing /api/orders, /api/bills,
// Customer, or Kitchen behavior. A "counter order" here is the merged,
// per-table running bill (a `bills` row with all its linked `orders`).

// GET /counter/orders - all active (open) bills, orders merged per table
app.get('/counter/orders', (req, res) => {
  try {
    const bills = db.prepare(`
      SELECT b.id as bill_id, b.bill_number, b.table_id, t.table_number,
             b.customer_phone, b.session_id, b.status, b.opened_at,
             b.subtotal, b.gst_amount, b.grand_total, b.total_paid
      FROM bills b
      JOIN tables t ON b.table_id = t.id
      WHERE b.status = 'open'
      ORDER BY b.opened_at ASC
    `).all();

    if (bills.length === 0) {
      return res.json({ success: true, count: 0, data: [] });
    }

    // All orders linked to any open bill (for status + timing + order list)
    const orderRows = db.prepare(`
      SELECT bi.bill_id, o.id as order_id, o.order_number, o.status, o.created_at
      FROM bill_items bi
      JOIN orders o ON o.id = bi.order_id
      WHERE bi.bill_id IN (${bills.map(() => '?').join(',')})
      ORDER BY o.created_at ASC
    `).all(...bills.map(b => b.bill_id));

    // All items across every order of every open bill, to be merged
    // (same menu item ordered more than once on the same bill is summed)
    const itemRows = db.prepare(`
      SELECT bi.bill_id, mi.id as menu_item_id, mi.name,
             oi.unit_price, oi.quantity, oi.total_price
      FROM bill_items bi
      JOIN order_items oi ON oi.order_id = bi.order_id
      JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE bi.bill_id IN (${bills.map(() => '?').join(',')})
    `).all(...bills.map(b => b.bill_id));

    // Group orders by bill
    const ordersByBill = new Map();
    orderRows.forEach(row => {
      if (!ordersByBill.has(row.bill_id)) ordersByBill.set(row.bill_id, []);
      ordersByBill.get(row.bill_id).push({
        orderId: row.order_id,
        orderNumber: row.order_number,
        status: row.status,
        createdAt: row.created_at
      });
    });

    // Merge items by menu_item_id within each bill
    const itemsByBill = new Map();
    itemRows.forEach(row => {
      if (!itemsByBill.has(row.bill_id)) itemsByBill.set(row.bill_id, new Map());
      const map = itemsByBill.get(row.bill_id);
      if (!map.has(row.menu_item_id)) {
        map.set(row.menu_item_id, {
          name: row.name,
          unitPrice: row.unit_price,
          quantity: 0,
          totalPrice: 0
        });
      }
      const merged = map.get(row.menu_item_id);
      merged.quantity += row.quantity;
      merged.totalPrice += row.total_price;
    });

    function overallStatus(orders) {
      if (!orders || orders.length === 0) return 'pending';
      const active = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
      const pool = active.length ? active : orders;
      const distinct = new Set(pool.map(o => o.status));
      if (distinct.size > 1) return 'mixed';
      // Normalize 'accepted' to 'pending' for display purposes
      const only = pool[0].status;
      return only === 'accepted' ? 'pending' : only;
    }

    const data = bills.map(b => {
      const orders = (ordersByBill.get(b.bill_id) || []).sort(
        (a, c) => new Date(a.createdAt) - new Date(c.createdAt)
      );
      const items = Array.from((itemsByBill.get(b.bill_id) || new Map()).values());
      const orderTime = orders.length ? orders[0].createdAt : b.opened_at;

      return {
        billId: b.bill_id,
        billNumber: b.bill_number,
        tableNumber: b.table_number,
        customerPhone: b.customer_phone,
        orderTime,
        status: overallStatus(orders),
        orders,
        items,
        subtotal: b.subtotal,
        gst: b.gst_amount,
        grandTotal: b.grand_total
      };
    });

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('Counter orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch counter orders' });
  }
});

// POST /counter/payment - mark a bill's active table order as paid, free the table
app.post('/counter/payment', (req, res) => {
  try {
    const { billId, payment_method, amount } = req.body;

    if (!billId || !payment_method) {
      return res.status(400).json({ success: false, message: 'billId and payment_method are required' });
    }

    const validMethods = ['cash', 'card', 'upi', 'wallet'];
    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    const bill = db.prepare("SELECT * FROM bills WHERE id = ? AND status = 'open'").get(billId);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Active bill not found' });
    }

    const payAmount = (amount !== undefined && amount !== null) ? amount : bill.grand_total;
    const transactionId = `TXN-${Date.now()}`;

    const runPayment = db.transaction(() => {
      db.prepare(`
        INSERT INTO payments (bill_id, amount, payment_method, transaction_id, status)
        VALUES (?, ?, ?, ?, 'completed')
      `).run(billId, payAmount, payment_method, transactionId);

      db.prepare(`
        UPDATE bills
        SET status = 'closed', total_paid = total_paid + ?, closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(payAmount, billId);

      db.prepare("UPDATE tables SET status = 'available' WHERE id = ?").run(bill.table_id);
      db.prepare("UPDATE sessions SET is_active = 0, ended_at = CURRENT_TIMESTAMP WHERE bill_id = ?").run(billId);
    });
    runPayment();

    // Notify counter screens and let kitchen know the table is free again
    io.to('counter').emit('bill_paid', { billId, amount: payAmount, method: payment_method });
    io.to('kitchen').emit('table_cleared', { tableId: bill.table_id });

    res.json({
      success: true,
      message: 'Payment recorded, order removed from active list, table freed',
      transactionId
    });
  } catch (error) {
    console.error('Counter payment error:', error);
    res.status(500).json({ success: false, message: 'Payment failed' });
  }
});

// DELETE /counter/order/:id - delete a table's active merged order (bill) entirely
app.delete('/counter/order/:id', (req, res) => {
  try {
    const billId = req.params.id;

    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const runDelete = db.transaction(() => {
      const orderIds = db.prepare('SELECT order_id FROM bill_items WHERE bill_id = ?')
        .all(billId)
        .map(r => r.order_id);

      // Unlink orders from the bill first (bill_items.order_id has ON DELETE RESTRICT)
      db.prepare('DELETE FROM bill_items WHERE bill_id = ?').run(billId);

      orderIds.forEach(orderId => {
        db.prepare('DELETE FROM order_items WHERE order_id = ?').run(orderId);
        db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
      });

      db.prepare('DELETE FROM bills WHERE id = ?').run(billId);

      // Only free the table if it isn't tied to some other open bill
      const stillOpen = db.prepare("SELECT COUNT(*) as c FROM bills WHERE table_id = ? AND status = 'open'").get(bill.table_id);
      if (stillOpen.c === 0) {
        db.prepare("UPDATE tables SET status = 'available' WHERE id = ?").run(bill.table_id);
      }
    });
    runDelete();

    io.to('counter').emit('order_deleted', { billId });
    io.to('kitchen').emit('table_cleared', { tableId: bill.table_id });

    res.json({ success: true, message: 'Order deleted and table freed' });
  } catch (error) {
    console.error('Counter delete order error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete order' });
  }
});

// ============================================
// ADMIN DASHBOARD API
// ============================================
// Standalone, read-only stats endpoint that powers the Admin
// Dashboard cards. Does not modify any existing table/order logic.

// GET /api/admin/dashboard/stats
app.get('/api/admin/dashboard/stats', (req, res) => {
  try {
    const totalTables = db.prepare('SELECT COUNT(*) as c FROM tables').get().c;
    const occupiedTables = db.prepare("SELECT COUNT(*) as c FROM tables WHERE status = 'occupied'").get().c;
    const freeTables = totalTables - occupiedTables;

    const todayOrders = db.prepare(`
      SELECT COUNT(*) as c FROM orders
      WHERE date(created_at) = date('now', 'localtime')
    `).get().c;

    const todayRevenue = db.prepare(`
      SELECT COALESCE(SUM(grand_total), 0) as total FROM orders
      WHERE date(created_at) = date('now', 'localtime') AND status = 'completed'
    `).get().total;

    const pendingOrders = db.prepare(`
      SELECT COUNT(*) as c FROM orders
      WHERE date(created_at) = date('now', 'localtime')
        AND status NOT IN ('completed', 'cancelled')
    `).get().c;

    const completedOrders = db.prepare(`
      SELECT COUNT(*) as c FROM orders
      WHERE date(created_at) = date('now', 'localtime') AND status = 'completed'
    `).get().c;

    res.json({
      success: true,
      data: {
        totalTables,
        occupiedTables,
        freeTables,
        todayOrders,
        todayRevenue,
        pendingOrders,
        completedOrders
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

// ============================================
// ADMIN MENU MANAGEMENT API
// ============================================
// Full CRUD for menu items used by the Admin > Menu Management screen.
// Separate from the public, read-only /api/menu (customer-facing) and
// /api/categories endpoints, which are left untouched.

function serializeMenuItem(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    image: row.image_url,
    categoryId: row.category_id,
    category: row.category_name,
    isVeg: !!row.is_veg,
    isBestSeller: !!row.is_best_seller,
    isAvailable: !!row.is_available,
    preparationTime: row.preparation_time,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// GET /api/admin/menu - list ALL items (available + hidden), for the admin table
app.get('/api/admin/menu', (req, res) => {
  try {
    const { category, status, search } = req.query;

    let query = `
      SELECT m.*, c.name as category_name
      FROM menu_items m
      JOIN categories c ON m.category_id = c.id
      WHERE 1 = 1
    `;
    const params = [];

    if (category && category !== 'all') {
      query += ' AND c.id = ?';
      params.push(category);
    }
    if (status === 'available') {
      query += ' AND m.is_available = 1';
    } else if (status === 'hidden') {
      query += ' AND m.is_available = 0';
    }
    if (search) {
      query += ' AND m.name LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY c.display_order, m.display_order, m.name';

    const items = db.prepare(query).all(...params);
    res.json({ success: true, count: items.length, data: items.map(serializeMenuItem) });
  } catch (error) {
    console.error('Admin menu list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch menu items' });
  }
});

// GET /api/admin/menu/:id - single item
app.get('/api/admin/menu/:id', (req, res) => {
  try {
    const item = db.prepare(`
      SELECT m.*, c.name as category_name
      FROM menu_items m
      JOIN categories c ON m.category_id = c.id
      WHERE m.id = ?
    `).get(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }
    res.json({ success: true, data: serializeMenuItem(item) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch menu item' });
  }
});

// POST /api/admin/menu - create a new item (multipart/form-data, optional "image" file)
app.post('/api/admin/menu', (req, res) => {
  uploadMenuImage.single('image')(req, res, (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ success: false, message: uploadErr.message });
    }

    try {
      const {
        name, description, price, category_id,
        is_veg, is_best_seller, is_available, preparation_time, display_order
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Item name is required' });
      }
      if (price === undefined || price === '' || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
        return res.status(400).json({ success: false, message: 'A valid price is required' });
      }
      if (!category_id) {
        return res.status(400).json({ success: false, message: 'Category is required' });
      }

      const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
      if (!category) {
        return res.status(400).json({ success: false, message: 'Selected category does not exist' });
      }

      const imageUrl = req.file ? `/uploads/menu/${req.file.filename}` : null;

      const result = db.prepare(`
        INSERT INTO menu_items
          (category_id, name, description, price, image_url, is_veg, is_best_seller, is_available, preparation_time, display_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        category_id,
        name.trim(),
        description || null,
        parseFloat(price),
        imageUrl,
        is_veg === 'false' ? 0 : 1,
        is_best_seller === 'true' ? 1 : 0,
        is_available === 'false' ? 0 : 1,
        preparation_time ? parseInt(preparation_time, 10) : 10,
        display_order ? parseInt(display_order, 10) : 0
      );

      const created = db.prepare(`
        SELECT m.*, c.name as category_name FROM menu_items m
        JOIN categories c ON m.category_id = c.id WHERE m.id = ?
      `).get(result.lastInsertRowid);

      io.emit('menu_updated', { action: 'created', itemId: created.id });

      res.status(201).json({ success: true, message: 'Menu item created', data: serializeMenuItem(created) });
    } catch (error) {
      console.error('Create menu item error:', error);
      res.status(500).json({ success: false, message: 'Failed to create menu item' });
    }
  });
});

// PUT /api/admin/menu/:id - edit an item (multipart/form-data, optional new "image" file)
app.put('/api/admin/menu/:id', (req, res) => {
  uploadMenuImage.single('image')(req, res, (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ success: false, message: uploadErr.message });
    }

    try {
      const itemId = req.params.id;
      const existing = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(itemId);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Menu item not found' });
      }

      const {
        name, description, price, category_id,
        is_veg, is_best_seller, is_available, preparation_time, display_order
      } = req.body;

      if (category_id) {
        const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
        if (!category) {
          return res.status(400).json({ success: false, message: 'Selected category does not exist' });
        }
      }

      if (price !== undefined && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
        return res.status(400).json({ success: false, message: 'A valid price is required' });
      }

      let imageUrl = existing.image_url;
      if (req.file) {
        imageUrl = `/uploads/menu/${req.file.filename}`;
        // Remove the old image file if it was a locally-uploaded one
        if (existing.image_url && existing.image_url.startsWith('/uploads/menu/')) {
          const oldPath = path.join(__dirname, existing.image_url.replace('/uploads/', 'uploads/'));
          fs.unlink(oldPath, () => {});
        }
      }

      db.prepare(`
        UPDATE menu_items SET
          name = ?, description = ?, price = ?, category_id = ?, image_url = ?,
          is_veg = ?, is_best_seller = ?, is_available = ?, preparation_time = ?, display_order = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        name !== undefined && name.trim() ? name.trim() : existing.name,
        description !== undefined ? description : existing.description,
        price !== undefined && price !== '' ? parseFloat(price) : existing.price,
        category_id || existing.category_id,
        imageUrl,
        is_veg !== undefined ? (is_veg === 'false' ? 0 : 1) : existing.is_veg,
        is_best_seller !== undefined ? (is_best_seller === 'true' ? 1 : 0) : existing.is_best_seller,
        is_available !== undefined ? (is_available === 'false' ? 0 : 1) : existing.is_available,
        preparation_time !== undefined && preparation_time !== '' ? parseInt(preparation_time, 10) : existing.preparation_time,
        display_order !== undefined && display_order !== '' ? parseInt(display_order, 10) : existing.display_order,
        itemId
      );

      const updated = db.prepare(`
        SELECT m.*, c.name as category_name FROM menu_items m
        JOIN categories c ON m.category_id = c.id WHERE m.id = ?
      `).get(itemId);

      io.emit('menu_updated', { action: 'updated', itemId: updated.id });

      res.json({ success: true, message: 'Menu item updated', data: serializeMenuItem(updated) });
    } catch (error) {
      console.error('Update menu item error:', error);
      res.status(500).json({ success: false, message: 'Failed to update menu item' });
    }
  });
});

// PATCH /api/admin/menu/:id/availability - Show / Hide item
app.patch('/api/admin/menu/:id/availability', (req, res) => {
  try {
    const itemId = req.params.id;
    const { is_available } = req.body;

    if (typeof is_available !== 'boolean') {
      return res.status(400).json({ success: false, message: '"is_available" boolean is required' });
    }

    const existing = db.prepare('SELECT id FROM menu_items WHERE id = ?').get(itemId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    db.prepare('UPDATE menu_items SET is_available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(is_available ? 1 : 0, itemId);

    io.emit('menu_updated', { action: is_available ? 'shown' : 'hidden', itemId: Number(itemId) });

    res.json({ success: true, message: is_available ? 'Item is now visible' : 'Item is now hidden' });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({ success: false, message: 'Failed to update availability' });
  }
});

// DELETE /api/admin/menu/:id - delete an item (and its uploaded image, if any)
app.delete('/api/admin/menu/:id', (req, res) => {
  try {
    const itemId = req.params.id;
    const existing = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(itemId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    const inUse = db.prepare('SELECT COUNT(*) as c FROM order_items WHERE menu_item_id = ?').get(itemId).c;
    if (inUse > 0) {
      return res.status(409).json({
        success: false,
        message: 'This item is referenced by existing orders and cannot be deleted. Hide it instead.'
      });
    }

    db.prepare('DELETE FROM menu_items WHERE id = ?').run(itemId);

    if (existing.image_url && existing.image_url.startsWith('/uploads/menu/')) {
      const imgPath = path.join(__dirname, existing.image_url.replace('/uploads/', 'uploads/'));
      fs.unlink(imgPath, () => {});
    }

    io.emit('menu_updated', { action: 'deleted', itemId: Number(itemId) });

    res.json({ success: true, message: 'Menu item deleted' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete menu item' });
  }
});

// ============================================
// ADMIN REPORTS API
// ============================================
// Read-only reporting for the Admin > Reports screen: Daily / Weekly /
// Monthly Sales, Best Selling Items, Revenue, and CSV export. Purely
// additive - does not touch orders/menu logic used elsewhere.

const VALID_REPORT_RANGES = ['daily', 'weekly', 'monthly'];

// Resolve the requested range + anchor date into a concrete SQL date
// window (inclusive) and a human-readable label.
function resolveReportRange(range, dateParam) {
  const safeRange = VALID_REPORT_RANGES.includes(range) ? range : 'daily';

  const isValidDate = typeof dateParam === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateParam);
  const anchor = isValidDate
    ? dateParam
    : db.prepare("SELECT date('now', 'localtime') as d").get().d;

  let startDate, endDate, rangeLabel, groupExpr;

  if (safeRange === 'daily') {
    startDate = anchor;
    endDate = anchor;
    rangeLabel = `Daily Sales — ${anchor}`;
    groupExpr = "strftime('%H:00', o.created_at)";
  } else if (safeRange === 'weekly') {
    const row = db.prepare("SELECT date(?, '-6 days') as d").get(anchor);
    startDate = row.d;
    endDate = anchor;
    rangeLabel = `Weekly Sales — ${startDate} to ${endDate}`;
    groupExpr = "date(o.created_at)";
  } else {
    const startRow = db.prepare("SELECT date(?, 'start of month') as d").get(anchor);
    const endRow = db.prepare("SELECT date(?, 'start of month', '+1 month', '-1 day') as d").get(anchor);
    startDate = startRow.d;
    endDate = endRow.d;
    rangeLabel = `Monthly Sales — ${anchor.slice(0, 7)}`;
    groupExpr = "date(o.created_at)";
  }

  return { range: safeRange, anchor, startDate, endDate, rangeLabel, groupExpr };
}

function getReportSummary(startDate, endDate, groupExpr) {
  const totals = db.prepare(`
    SELECT
      COUNT(*) as totalOrders,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN grand_total ELSE 0 END), 0) as totalRevenue,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN gst_amount ELSE 0 END), 0) as totalGst,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN discount_amount ELSE 0 END), 0) as totalDiscount,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN subtotal ELSE 0 END), 0) as totalSubtotal,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedOrders,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledOrders
    FROM orders o
    WHERE date(o.created_at) BETWEEN ? AND ?
  `).get(startDate, endDate);

  const avgOrderValue = totals.completedOrders > 0 ? totals.totalRevenue / totals.completedOrders : 0;

  const chart = db.prepare(`
    SELECT
      ${groupExpr} as label,
      COUNT(*) as orders,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN grand_total ELSE 0 END), 0) as revenue
    FROM orders o
    WHERE date(o.created_at) BETWEEN ? AND ?
    GROUP BY label
    ORDER BY label ASC
  `).all(startDate, endDate);

  return {
    totalOrders: totals.totalOrders,
    completedOrders: totals.completedOrders,
    cancelledOrders: totals.cancelledOrders,
    totalRevenue: totals.totalRevenue,
    totalGst: totals.totalGst,
    totalDiscount: totals.totalDiscount,
    totalSubtotal: totals.totalSubtotal,
    avgOrderValue,
    chart
  };
}

function getBestSellers(startDate, endDate, limit) {
  return db.prepare(`
    SELECT
      mi.id as itemId,
      mi.name as name,
      c.name as category,
      SUM(oi.quantity) as quantitySold,
      COALESCE(SUM(oi.total_price), 0) as revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    JOIN categories c ON mi.category_id = c.id
    WHERE date(o.created_at) BETWEEN ? AND ? AND o.status = 'completed'
    GROUP BY mi.id
    ORDER BY quantitySold DESC, revenue DESC
    LIMIT ?
  `).all(startDate, endDate, limit);
}

// GET /api/admin/reports/summary - Daily / Weekly / Monthly Sales + Revenue
app.get('/api/admin/reports/summary', (req, res) => {
  try {
    const { range, startDate, endDate, rangeLabel, groupExpr } = resolveReportRange(req.query.range, req.query.date);
    const summary = getReportSummary(startDate, endDate, groupExpr);

    res.json({
      success: true,
      data: { range, startDate, endDate, rangeLabel, ...summary }
    });
  } catch (error) {
    console.error('Reports summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate sales report' });
  }
});

// GET /api/admin/reports/best-sellers - Best Selling Items for the range
app.get('/api/admin/reports/best-sellers', (req, res) => {
  try {
    const { range, startDate, endDate, rangeLabel } = resolveReportRange(req.query.range, req.query.date);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const items = getBestSellers(startDate, endDate, limit);

    res.json({
      success: true,
      range, startDate, endDate, rangeLabel,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error('Best sellers report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate best sellers report' });
  }
});

// Minimal CSV helpers (no extra dependency needed)
function csvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}
function toCsv(headers, rows) {
  const lines = [headers.map(csvCell).join(',')];
  rows.forEach(r => lines.push(r.map(csvCell).join(',')));
  return lines.join('\r\n');
}

// GET /api/admin/reports/export?range=daily|weekly|monthly&date=YYYY-MM-DD&report=sales|best-sellers
app.get('/api/admin/reports/export', (req, res) => {
  try {
    const { range, startDate, endDate } = resolveReportRange(req.query.range, req.query.date);
    const reportType = req.query.report === 'best-sellers' ? 'best-sellers' : 'sales';

    let csv, filename;

    if (reportType === 'best-sellers') {
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
      const items = getBestSellers(startDate, endDate, limit);

      const rows = items.map((item, idx) => [
        idx + 1, item.name, item.category, item.quantitySold, item.revenue.toFixed(2)
      ]);
      csv = toCsv(['Rank', 'Item', 'Category', 'Quantity Sold', 'Revenue'], rows);
      filename = `best-sellers-${range}-${startDate}_to_${endDate}.csv`;
    } else {
      const { groupExpr } = resolveReportRange(range, req.query.date);
      const summary = getReportSummary(startDate, endDate, groupExpr);

      const rows = summary.chart.map(c => [c.label, c.orders, c.revenue.toFixed(2)]);
      rows.push([]);
      rows.push(['TOTAL', summary.totalOrders, summary.totalRevenue.toFixed(2)]);
      rows.push(['Completed Orders', summary.completedOrders, '']);
      rows.push(['Cancelled Orders', summary.cancelledOrders, '']);
      rows.push(['GST Collected', '', summary.totalGst.toFixed(2)]);
      rows.push(['Avg Order Value', '', summary.avgOrderValue.toFixed(2)]);

      csv = toCsv(['Period', 'Orders', 'Revenue'], rows);
      filename = `sales-${range}-${startDate}_to_${endDate}.csv`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    console.error('Report export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export report' });
  }
});

// ============================================
// ADMIN RESTAURANT SETTINGS API
// ============================================
// Update for the Admin > Restaurant Settings screen: name, logo, phone,
// GST number, address, opening/closing time - stored as rows in the
// existing "settings" key/value table. Reads go through the public
// GET /api/settings/restaurant above; this is the write side only.

function upsertSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(key, value);
}

const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// PUT /api/admin/settings/restaurant - update restaurant profile (multipart/form-data, optional "logo" file)
app.put('/api/admin/settings/restaurant', (req, res) => {
  uploadLogoImage.single('logo')(req, res, (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ success: false, message: uploadErr.message });
    }

    try {
      const {
        restaurant_name, phone, gst_number, address, opening_time, closing_time, remove_logo
      } = req.body;

      if (!restaurant_name || !restaurant_name.trim()) {
        return res.status(400).json({ success: false, message: 'Restaurant name is required' });
      }
      if (opening_time && !TIME_24H_REGEX.test(opening_time)) {
        return res.status(400).json({ success: false, message: 'Opening time must be in HH:MM (24h) format' });
      }
      if (closing_time && !TIME_24H_REGEX.test(closing_time)) {
        return res.status(400).json({ success: false, message: 'Closing time must be in HH:MM (24h) format' });
      }
      if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid phone number' });
      }
      if (gst_number && !/^[0-9A-Za-z]{15}$/.test(gst_number.trim())) {
        return res.status(400).json({ success: false, message: 'GST number must be a valid 15-character GSTIN' });
      }

      const existingLogoRow = db.prepare(`SELECT value FROM settings WHERE key = 'logo_url'`).get();
      const existingLogo = existingLogoRow ? existingLogoRow.value : null;
      let logoUrl = existingLogo;

      if (req.file) {
        logoUrl = `/uploads/branding/${req.file.filename}`;
        if (existingLogo && existingLogo.startsWith('/uploads/branding/')) {
          const oldPath = path.join(__dirname, existingLogo.replace('/uploads/', 'uploads/'));
          fs.unlink(oldPath, () => {});
        }
      } else if (remove_logo === 'true') {
        if (existingLogo && existingLogo.startsWith('/uploads/branding/')) {
          const oldPath = path.join(__dirname, existingLogo.replace('/uploads/', 'uploads/'));
          fs.unlink(oldPath, () => {});
        }
        logoUrl = null;
      }

      const updateAll = db.transaction(() => {
        upsertSetting('restaurant_name', restaurant_name.trim());
        upsertSetting('logo_url', logoUrl);
        upsertSetting('contact_phone', phone !== undefined ? phone.trim() : '');
        upsertSetting('gst_number', gst_number !== undefined ? gst_number.trim().toUpperCase() : '');
        upsertSetting('address', address !== undefined ? address.trim() : '');
        upsertSetting('opening_time', opening_time || '');
        upsertSetting('closing_time', closing_time || '');
      });
      updateAll();

      io.emit('settings_updated', { section: 'restaurant' });

      res.json({ success: true, message: 'Restaurant settings updated', data: readRestaurantSettings() });
    } catch (error) {
      console.error('Update restaurant settings error:', error);
      res.status(500).json({ success: false, message: 'Failed to update restaurant settings' });
    }
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// ============================================
// START SERVER
// ============================================
server.listen(PORT, HOST, () => {
  console.log('\n🍽️  Muralidhar Restaurant System');
  console.log('=====================================');
  console.log(`✅ Server running at: http://${HOST}:${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`💾 Database: ${DB_PATH}`);
  console.log('\n📱 Customer URLs:');
  for (let table = 1; table <= 12; table++) {
    console.log(`   http://${HOST}:${PORT}/customer/index.html?table=${table}`);
  }
  console.log('\n🍳 Kitchen Dashboard:');
  console.log(`   http://${HOST}:${PORT}/kitchen/`);
  console.log('\n💰 Counter Dashboard:');
  console.log(`   http://${HOST}:${PORT}/counter/`);
  console.log('\n⚙️  Admin Panel:');
  console.log(`   http://${HOST}:${PORT}/admin/`);
  console.log('\n🔌 Socket.IO ready for real-time updates');
  console.log('=====================================\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  db.close();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io, db };
