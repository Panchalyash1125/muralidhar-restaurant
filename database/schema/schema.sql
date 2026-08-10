CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'staff' CHECK(role IN ('admin','manager','staff','kitchen')),
    email VARCHAR(100), phone VARCHAR(15), is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY, table_number INTEGER NOT NULL UNIQUE, capacity INTEGER NOT NULL DEFAULT 4,
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK(status IN ('available','occupied','reserved','cleaning')),
    qr_code_url TEXT, location VARCHAR(100), created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY, name VARCHAR(50) NOT NULL UNIQUE, description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY, category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL, description TEXT, price DECIMAL(10,2) NOT NULL, image_url TEXT,
    is_veg BOOLEAN NOT NULL DEFAULT TRUE, is_best_seller BOOLEAN NOT NULL DEFAULT FALSE,
    is_available BOOLEAN NOT NULL DEFAULT TRUE, preparation_time INTEGER DEFAULT 10,
    display_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY, order_number VARCHAR(20) NOT NULL UNIQUE,
    table_id INTEGER NOT NULL REFERENCES tables(id) ON DELETE RESTRICT,
    customer_name VARCHAR(60), customer_phone VARCHAR(15) NOT NULL, session_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','preparing','ready','completed','cancelled')),
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0, gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0, grand_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    special_instructions TEXT, estimated_time INTEGER, accepted_at TIMESTAMP, prepared_at TIMESTAMP,
    ready_at TIMESTAMP, completed_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK(quantity > 0), unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','preparing','ready','served')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS bills (
    id SERIAL PRIMARY KEY, bill_number VARCHAR(20) NOT NULL UNIQUE,
    table_id INTEGER NOT NULL REFERENCES tables(id) ON DELETE RESTRICT,
    customer_name VARCHAR(60), customer_phone VARCHAR(15) NOT NULL, session_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK(status IN ('open','paid','closed')),
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0, gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0, grand_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_paid DECIMAL(10,2) NOT NULL DEFAULT 0, opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS bill_items (
    id SERIAL PRIMARY KEY, bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY, bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE RESTRICT,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK(payment_method IN ('cash','card','upi','wallet')),
    transaction_id VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK(status IN ('pending','completed','failed','refunded')),
    notes TEXT, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY, session_id VARCHAR(50) NOT NULL UNIQUE,
    table_id INTEGER NOT NULL REFERENCES tables(id) ON DELETE RESTRICT,
    customer_name VARCHAR(60), customer_phone VARCHAR(15) NOT NULL,
    bill_id INTEGER REFERENCES bills(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE, started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY, key VARCHAR(50) NOT NULL UNIQUE, value TEXT, description TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, entity_type VARCHAR(50), entity_id INTEGER,
    details TEXT, ip_address VARCHAR(45), created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_bills_table ON bills(table_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_session ON bills(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_menu_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_available ON menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);
