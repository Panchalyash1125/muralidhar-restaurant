# Admin Username + Password Change Fix

- Initial Admin login remains `admin` / `admin123`.
- Login page does not display credential hints.
- Admin > Restaurant Settings now includes **Change Admin Username** and **Change Admin Password**.
- Changed username is stored in the existing Neon `settings` table as `admin_username`.
- Changed password is stored only as bcrypt hash in `admin_password_hash`.
- Username change requires the current password.
- Other open Admin sessions are invalidated after a username change.
- No database migration is required because the existing key/value `settings` table is reused.
