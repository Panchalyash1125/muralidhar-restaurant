# 🍽️ Muralidhar Restaurant QR Ordering System
## Complete Setup Guide

---

## 📋 PREREQUISITES

Before you start, make sure you have:

| Requirement | Version | Download Link |
|-------------|---------|---------------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **npm** | 9+ | Comes with Node.js |
| **Git** | Latest | [git-scm.com](https://git-scm.com) |
| **Web Browser** | Chrome/Firefox/Safari/Edge | Latest version |

### Check if Node.js is installed:
```bash
node --version    # Should show v18.x.x or higher
npm --version     # Should show 9.x.x or higher
```

If not installed, download from [nodejs.org](https://nodejs.org) and install.

---

## 🚀 STEP-BY-STEP SETUP

### STEP 1: Download the Project

```bash
# Navigate to where you want the project
cd Desktop

# Create project folder
mkdir Muralidhar-Restaurant-System
cd Muralidhar-Restaurant-System

# Extract all files here (or clone if using git)
```

**Expected folder structure after extraction:**
```
Muralidhar-Restaurant-System/
├── README.md
├── package.json
├── .env.example
├── customer/          ← Customer Module (Module 1 ✅)
├── counter/           ← Counter Module (Module 4)
├── kitchen/           ← Kitchen Module (Module 3)
├── admin/             ← Admin Module (Module 5)
├── backend/           ← API Server (Module 2 ✅)
├── shared/            ← Common assets
├── database/          ← Database files
├── docs/              ← Documentation
└── docker/            ← Docker config
```

---

### STEP 2: Install Dependencies

```bash
# In the project root folder (where package.json is located)
npm install
```

**What this does:**
- Downloads Express.js (web server)
- Downloads Socket.IO (real-time communication)
- Downloads SQLite3 (database)
- Downloads security packages (helmet, cors, rate-limit)
- Downloads all other required packages

**Expected output:**
```
added 150 packages in 15s
```

If you see errors, try:
```bash
npm install --force
# or
npm install --legacy-peer-deps
```

---

### STEP 3: Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Open .env in your text editor
# Windows: notepad .env
# Mac: open -e .env
# Linux: nano .env
```

**Default .env file (already good for development):**
```env
NODE_ENV=development
PORT=3000
HOST=localhost

DB_PATH=./backend/database/restaurant.db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

ADMIN_USERNAME=admin
ADMIN_PASSWORD=muralidhar123

OTP_EXPIRY_SECONDS=120
OTP_MAX_ATTEMPTS=3
GST_RATE=0.05

CORS_ORIGINS=http://localhost:8080,http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

SOCKET_CORS_ORIGIN=http://localhost:8080
DEMO_MODE=true
DEMO_OTP=123456
```

**Important:** Change `ADMIN_PASSWORD` and `JWT_SECRET` for production!

---

### STEP 4: Initialize the Database

```bash
# Run the database setup script
npm run setup

# OR manually:
node backend/database/setup.js
```

**Expected output:**
```
🍽️  Muralidhar Restaurant - Database Setup
=====================================
✅ Created database directory
📦 Creating new database...
✅ Database created at: .../restaurant.db
✅ Enabled WAL mode and foreign keys
📋 Executing schema...
✅ Executed 25 schema statements
🌱 Seeding data...
✅ Executed 8 seed statements
🔍 Verifying tables...
Found 12 tables:
  • activity_logs
  • bill_items
  • bills
  • categories
  • menu_items
  • order_items
  • orders
  • otp_logs
  • payments
  • sessions
  • settings
  • tables
  • users
📊 Verifying seed data...
  • Menu items: 3
  • Tables: 2
  • Categories: 3
✅ Database setup complete!
```

---

### STEP 5: Start the Server

```bash
# Start the server
npm start

# OR for development (auto-restart on file changes):
npm run dev
```

**Expected output:**
```
🍽️  Muralidhar Restaurant System
=====================================
✅ Server running at: http://localhost:3000
📊 Environment: development
💾 Database: .../restaurant.db
📱 Customer URL:
   http://localhost:3000/customer/index.html?table=1
   http://localhost:3000/customer/index.html?table=2
🍳 Kitchen Dashboard:
   http://localhost:3000/kitchen/
💰 Counter Dashboard:
   http://localhost:3000/counter/
⚙️  Admin Panel:
   http://localhost:3000/admin/
🔌 Socket.IO ready for real-time updates
=====================================
```

**✅ Server is now running!**

---

## 🧪 HOW TO TEST THE SYSTEM

### Test 1: Customer Ordering Flow

1. **Open browser** and go to:
   ```
   http://localhost:3000/customer/index.html?table=1
   ```

2. **You should see:**
   - Muralidhar Restaurant logo
   - "Table 1" badge
   - "Start Ordering" button

3. **Click "Start Ordering"**
   - Menu page loads
   - Shows 3 items: Cha (₹10), Poha (₹30), Roti (₹15)

4. **Add items to cart:**
   - Click "ADD" on Cha → Toast: "Cha added to cart!"
   - Click "ADD" on Poha → Toast: "Poha added to cart!"
   - Floating cart appears at bottom

5. **Click floating cart** → Cart page opens

6. **Click "Place Order"** → Phone modal appears

7. **Enter phone number:** `9876543210`

8. **Click "Send OTP"** → OTP modal appears
   - Demo OTP shown: `123456`

9. **Enter OTP:** `123456`

10. **Click "Verify & Place Order"**
    - Loading spinner
    - Success page with order number
    - Estimated time: 10-15 mins

### Test 2: Invalid Table

Go to:
```
http://localhost:3000/customer/index.html?table=99
```

**Expected:** Error message "Invalid Table" with retry button

### Test 3: API Health Check

Open in browser or use curl:
```
http://localhost:3000/api/health
```

**Expected JSON:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-07-19T...",
  "environment": "development",
  "version": "1.0.0"
}
```

### Test 4: Menu API

```
http://localhost:3000/api/menu
```

**Expected:** JSON with 3 menu items

---

## 📱 TESTING ON MOBILE PHONE

### Method 1: Same WiFi Network

1. Find your computer's IP address:
   ```bash
   # Windows
   ipconfig

   # Mac/Linux
   ifconfig | grep "inet "
   ```
   Look for something like `192.168.1.5`

2. On your phone, open browser and go to:
   ```
   http://192.168.1.5:3000/customer/index.html?table=1
   ```
   (Replace with your actual IP)

### Method 2: QR Code Generator

1. Go to any QR code generator website
2. Enter URL: `http://YOUR_IP:3000/customer/index.html?table=1`
3. Print and place on Table 1
4. Scan with phone camera

---

## 🔧 COMMON ISSUES & FIXES

### Issue 1: "Port 3000 already in use"

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Fix:**
```bash
# Find process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9

# Or use different port:
PORT=8080 npm start
```

### Issue 2: "Cannot find module 'better-sqlite3'"

**Fix:**
```bash
npm install better-sqlite3
# If fails on Windows, install Python and Visual Studio Build Tools first
```

### Issue 3: "Database is locked"

**Fix:**
```bash
# Close all terminals running the server
# Delete the database file and reinitialize:
rm backend/database/restaurant.db
rm backend/database/restaurant.db-shm
rm backend/database/restaurant.db-wal
npm run setup
```

### Issue 4: CORS errors in browser console

**Fix:** Check `.env` file has correct CORS origins:
```env
CORS_ORIGINS=http://localhost:8080,http://localhost:3000
```

Add your actual IP if testing from phone:
```env
CORS_ORIGINS=http://localhost:8080,http://localhost:3000,http://192.168.1.5:3000
```

### Issue 5: Images not loading

**Fix:** The system uses auto-generated SVG placeholders. Real images will be added in Module 6. For now, colored letter placeholders are shown automatically.

---

## 🔄 USEFUL COMMANDS

| Command | Description |
|---------|-------------|
| `npm start` | Start server (production mode) |
| `npm run dev` | Start server with auto-restart (development) |
| `npm run setup` | Initialize/reset database |
| `npm run seed` | Re-seed database with sample data |
| `npm run reset-db` | Delete and recreate database |
| `Ctrl + C` | Stop the server |

---

## 🏗️ ARCHITECTURE OVERVIEW

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Customer      │     │   Backend API   │     │   Database      │
│   (Browser)     │◄───►│   (Node.js)     │◄───►│   (SQLite)      │
│                 │     │   Port 3000     │     │   restaurant.db │
│  index.html     │     │                 │     │                 │
│  menu.html      │     │  /api/menu      │     │  menu_items     │
│  cart.html      │     │  /api/orders    │     │  orders         │
│  success.html   │     │  /api/otp/*     │     │  bills          │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         │              ┌────────┴────────┐
         │              │   Socket.IO     │
         │              │   Real-time     │
         │              │   Updates       │
         │              └────────┬────────┘
         │                       │
┌────────┴────────┐    ┌────────┴────────┐
│   Kitchen       │    │   Counter       │
│   Dashboard     │    │   Dashboard     │
│   (Live Orders) │    │   (Bills/Pay)   │
└─────────────────┘    └─────────────────┘
```

---

## 📞 SUPPORT

If you encounter issues not covered here:

1. Check the browser console (F12 → Console) for errors
2. Check the server terminal for backend errors
3. Verify all files are in correct locations
4. Try deleting `node_modules` and running `npm install` again

---

**✅ You are now ready to use the Muralidhar Restaurant QR Ordering System!**

Start with the customer flow at: `http://localhost:3000/customer/index.html?table=1`
