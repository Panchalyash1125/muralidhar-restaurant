# Muralidhar Restaurant QR Ordering System

## Production-Grade Restaurant Management System

---

## 📁 FOLDER STRUCTURE EXPLANATION

### Root Level
```
Muralidhar-Restaurant-System/
├── README.md                 # Project documentation
├── package.json              # Root package configuration
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
└── docker-compose.yml        # Docker orchestration
```

### 1. `/customer/` - Customer-Facing Module
**Purpose:** Everything the customer sees and interacts with.

| Subfolder | Purpose |
|-----------|---------|
| `css/` | Customer-specific stylesheets (menu, cart, animations) |
| `js/` | Customer-side JavaScript (menu logic, cart state, OTP) |
| `images/` | Food images, restaurant logo, QR codes |
| `pages/` | Static HTML pages (menu.html, cart.html, success.html) |
| `index.html` | Entry point - detects table from QR, redirects to menu |

**Why separate?** Customer module is the public-facing interface. It must be:
- Lightweight (fast loading on mobile)
- Isolated from admin/counter security concerns
- Cacheable via CDN
- Works without authentication

### 2. `/counter/` - Billing Counter Module
**Purpose:** Staff interface for managing bills, payments, and table status.

| Subfolder | Purpose |
|-----------|---------|
| `css/` | Counter-specific styles (POS-like interface) |
| `js/` | Counter logic (bill search, payment processing, print) |
| `images/` | Counter UI assets |

**Why separate?** Counter staff need a different UI paradigm:
- POS-style interface (not consumer menu)
- Authentication required
- Printer integration
- Cash drawer / payment hardware support

### 3. `/kitchen/` - Kitchen Display System (KDS)
**Purpose:** Live order display for kitchen staff.

| Subfolder | Purpose |
|-----------|---------|
| `css/` | Kitchen-optimized styles (large text, color-coded status) |
| `js/` | Socket.IO client for real-time updates, timer logic |
| `images/` | Kitchen UI assets |

**Why separate?** Kitchen environment is unique:
- Needs large, readable fonts (hands may be messy)
- Color-coded status for quick scanning
- Sound notifications (bell/alert)
- No page refresh (Socket.IO)
- Works on kitchen-mounted tablets/displays

### 4. `/admin/` - Administration Panel
**Purpose:** Restaurant owner/manager dashboard.

| Subfolder | Purpose |
|-----------|---------|
| `css/` | Admin dashboard styles (charts, tables, forms) |
| `js/` | Admin logic (CRUD operations, analytics, reports) |
| `images/` | Admin UI assets |
| `pages/` | Admin sub-pages (menu-mgmt, reports, settings) |

**Why separate?** Admin has different access patterns:
- Full CRUD operations
- Analytics and reporting
- User management
- Settings configuration
- Higher security requirements

### 5. `/backend/` - API Server
**Purpose:** Core business logic, database operations, real-time communication.

| Subfolder | Purpose |
|-----------|---------|
| `config/` | Database config, server config, environment setup |
| `controllers/` | Request handlers (business logic) |
| `models/` | Database models (ORM/Queries) |
| `routes/` | API route definitions |
| `middleware/` | Auth, validation, error handling, CORS |
| `utils/` | Helper functions (OTP generation, validators, formatters) |
| `services/` | External services (SMS, payment gateway, email) |
| `sockets/` | Socket.IO event handlers (kitchen real-time) |
| `database/` | Migration and seed scripts |

**Why MVC?** Clean separation of concerns:
- **Models:** Data layer (database operations)
- **Views:** Frontend modules (customer, counter, kitchen, admin)
- **Controllers:** Business logic layer
- **Middleware:** Cross-cutting concerns (auth, logging, validation)

### 6. `/shared/` - Common Assets
**Purpose:** Reusable components across all frontend modules.

| Subfolder | Purpose |
|-----------|---------|
| `css/` | Common styles (variables, reset, utilities, animations) |
| `js/` | Shared utilities (API client, storage helpers, formatters) |
| `images/` | Common images (logo, icons, backgrounds) |
| `fonts/` | Custom fonts |
| `icons/` | SVG icon library |

**Why shared?** DRY principle - avoid duplicating:
- Color variables (orange theme)
- Animation keyframes
- API fetch wrappers
- Currency formatters
- Date/time utilities

### 7. `/database/` - Database Scripts
**Purpose:** Schema definitions and seed data.

| Subfolder | Purpose |
|-----------|---------|
| `schema/` | SQL schema files (CREATE TABLE statements) |
| `seeds/` | Initial data (menu items, categories, tables) |

**Why separate?** Database is infrastructure:
- Version-controlled schema
- Reproducible environments
- Easy CI/CD integration

### 8. `/docs/` - Documentation
**Purpose:** API docs, deployment guides, user manuals.

| Subfolder | Purpose |
|-----------|---------|
| `api/` | API endpoint documentation |
| `deployment/` | Deployment guides (Docker, AWS, VPS) |

### 9. `/docker/` - Containerization
**Purpose:** Docker configurations for consistent deployment.

### 10. `/scripts/` - Automation
**Purpose:** Build scripts, deployment scripts, backup scripts.

---

## 🏗️ ARCHITECTURE PRINCIPLES

### 1. Separation of Concerns
Each module is independent. Customer module doesn't know about admin internals.

### 2. Single Responsibility
Each file does ONE thing. `menu.js` handles menu. `cart.js` handles cart.

### 3. DRY (Don't Repeat Yourself)
Shared utilities in `/shared/`. Common styles in `/shared/css/`.

### 4. Security by Default
- Input validation on EVERY endpoint
- XSS prevention in all rendered content
- SQL injection prevention via parameterized queries
- Rate limiting on OTP endpoints

### 5. Scalability
- Stateless API design
- Socket.IO for real-time (not polling)
- Database normalization
- CDN-ready static assets

### 6. Maintainability
- Meaningful variable names
- Comprehensive comments on complex logic
- Consistent code style
- Modular file structure

---

## 🔄 DATA FLOW

```
Customer QR Scan
       ↓
  customer/index.html (detects ?table=1)
       ↓
  customer/menu.html (loads menu from API)
       ↓
  customer/cart.html (manages cart state)
       ↓
  OTP Verification → POST /api/orders
       ↓
  Backend validates → Inserts to DB
       ↓
  Socket.IO emits → Kitchen Dashboard updates
       ↓
  Counter Dashboard shows open bill
       ↓
  Payment → Bill closed → Table available
```

---

## 🛠️ TECH STACK

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | Vanilla HTML/CSS/JS | Zero dependencies, fast loading, full control |
| Backend | Node.js + Express | Lightweight, fast, JavaScript ecosystem |
| Real-time | Socket.IO | Reliable WebSocket with fallbacks |
| Database | SQLite (dev) / PostgreSQL (prod) | Simple, reliable, ACID compliant |
| Styling | Custom CSS | No Bootstrap bloat, unique design |
| Icons | SVG + Font Awesome | Scalable, customizable |
| QR Codes | qrcode.js | Client-side generation |

---

## 🚀 MODULE BUILDING ORDER

1. **Module 1:** Project Architecture + Customer Module ✅
2. **Module 2:** Backend API + Database
3. **Module 3:** Kitchen Dashboard
4. **Module 4:** Counter Dashboard
5. **Module 5:** Admin Panel
6. **Module 6:** Integration, Testing, Deployment

---

## 📋 PREREQUISITES

- Node.js 18+ 
- npm 9+
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Mobile device for QR testing (or QR code simulator)

---

*Built with enterprise-grade standards for Muralidhar Restaurant.*
