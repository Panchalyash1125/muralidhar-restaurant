# Restaurant Settings, Image Upload & Admin Security Fix

## What changed

### Menu images
- Admin menu image frontend validation now allows JPG/JPEG, PNG and WEBP up to 5 MB.
- Backend Multer menu image limit remains/enforces 5 MB.
- Oversized uploads return: `Image size must be less than 5 MB.`
- The old 750 KB LocalStorage-era restriction was removed.

### Restaurant settings
- Existing PostgreSQL `settings` table remains the single source of truth.
- Supported settings now include restaurant name, logo, phone, WhatsApp, GSTIN, address, email, description, opening time and closing time.
- Shared `restaurant-settings.js` loads current settings with `cache: no-store` and applies them to Customer/Table, Kitchen, Counter and Admin pages.
- Counter Bill view refreshes current restaurant settings before displaying restaurant name/logo/address/mobile/GSTIN.
- No database schema migration is required. New setting keys are created by the existing upsert logic when settings are saved.

### Admin security
- Removed demo password/password hint and the "Keep me signed in" persistent login option.
- Removed frontend hardcoded credential verification and localStorage admin sessions.
- `/api/admin/login` validates credentials on the backend.
- Prefer `ADMIN_PASSWORD_HASH` (bcrypt); optional server-only `ADMIN_PASSWORD` fallback is supported.
- All `/api/admin/*` routes after login are protected by a backend bearer token.
- Dashboard receives the token only once in the URL fragment, immediately removes the fragment, and keeps the token in page memory only.
- Refreshing, reopening or directly visiting `admin/dashboard.html` therefore returns to the Admin login page.
- Logout invalidates the backend token and returns to the password screen.

## Deployment requirement
Set Admin credentials in your host environment (for example Koyeb). Do not put the real password in GitHub.

Preferred:
1. Generate a bcrypt hash locally: `npm run admin:hash -- "your-strong-password"`
2. Add the output to Koyeb as `ADMIN_PASSWORD_HASH`.
3. Keep `ADMIN_USERNAME=admin` or change it if desired.

Alternative: set `ADMIN_PASSWORD` only in server/Koyeb environment variables.

## Database migration
No schema migration is required.
