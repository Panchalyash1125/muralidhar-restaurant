# Muralidhar Restaurant - Neon PostgreSQL Edition

This build is the **No-OTP** version and is ready for a Node.js host such as Koyeb.

- Customer enters name + 10-digit mobile number, then order is placed directly.
- Database: Neon PostgreSQL (`DATABASE_URL`).
- Server: Node.js + Express + Socket.IO.
- Customer, Kitchen, Counter and Admin are served by the same app.
- 12 table URLs are supported with `?table=1` through `?table=12`.

For Koyeb instructions see `KOYEB_NEON_DEPLOY.md`.
