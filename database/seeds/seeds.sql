-- ============================================
-- MURALIDHAR RESTAURANT - SEED DATA
-- Initial data for development and testing
-- ============================================

-- ============================================
-- SEED USERS (Admin Account)
-- ============================================
INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role, email, is_active) 
VALUES (1, 'admin', '$2a$10$YourHashedPasswordHere', 'Restaurant Admin', 'admin', 'admin@muralidhar.com', 1);

-- ============================================
-- SEED TABLES (Table 1 to Table 12)
-- ============================================
INSERT OR IGNORE INTO tables (id, table_number, capacity, status, location) VALUES
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
(12, 12, 4, 'available', 'Main Hall - Table 12');

-- ============================================
-- SEED CATEGORIES
-- ============================================
INSERT OR IGNORE INTO categories (id, name, description, display_order) VALUES
(1, 'Beverages', 'Hot and cold beverages', 1),
(2, 'Breakfast', 'Morning breakfast items', 2),
(3, 'Bread', 'Fresh breads and rotis', 3);

-- ============================================
-- SEED MENU ITEMS
-- ============================================
INSERT OR IGNORE INTO menu_items (id, category_id, name, description, price, image_url, is_veg, is_best_seller, is_available, preparation_time, display_order) VALUES
(1, 1, 'Cha', 'Fresh Hot Tea brewed with premium Assam tea leaves, ginger, and cardamom. Served steaming hot in traditional kulhad.', 10.00, 'images/cha.jpg', 1, 1, 1, 5, 1),
(2, 2, 'Poha', 'Fresh Gujarati Poha made with flattened rice, peanuts, curry leaves, and mustard seeds. Light, fluffy, and full of flavor.', 30.00, 'images/poha.jpg', 1, 1, 1, 10, 1),
(3, 3, 'Roti', 'Fresh Butter Roti made from whole wheat dough, cooked on tawa with pure desi ghee. Soft, warm, and melts in your mouth.', 15.00, 'images/roti.jpg', 1, 0, 1, 8, 1);

-- ============================================
-- SEED SETTINGS
-- ============================================
INSERT OR IGNORE INTO settings (key, value, description) VALUES
('restaurant_name', 'Muralidhar Restaurant', 'Restaurant display name'),
('gst_rate', '0.05', 'GST percentage (5%)'),
('currency', '₹', 'Currency symbol'),
('otp_expiry', '120', 'OTP expiry time in seconds'),
('otp_max_attempts', '3', 'Maximum OTP verification attempts'),
('default_preparation_time', '15', 'Default food preparation time in minutes'),
('theme_color', '#FF6B00', 'Primary theme color'),
('contact_phone', '+91 9876543210', 'Restaurant contact number'),
('address', 'Main Street, Gujarat, India', 'Restaurant address'),
('enable_demo_otp', 'true', 'Enable demo OTP for testing');
