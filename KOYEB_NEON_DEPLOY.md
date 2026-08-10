# Koyeb + Neon deployment

This version uses Neon PostgreSQL through the `DATABASE_URL` environment variable.

## Koyeb settings
- Build command: `npm install`
- Start command: `npm start`
- Required environment variable: `DATABASE_URL` = your Neon connection string
- Optional: `NODE_ENV=production`
- Optional: `HOST=0.0.0.0`

Do not upload a real `.env` file or database password to GitHub.

The existing Neon database already has the schema/data if you followed the setup in ChatGPT. `npm run setup` is only needed for a fresh empty database.

## URLs after deploy
- Customer Table 1: `/customer/index.html?table=1`
- Customer Table 12: `/customer/index.html?table=12`
- Kitchen: `/kitchen/`
- Counter: `/counter/`
- Admin: `/admin/`
- Health: `/api/health`

## Important
Koyeb local disk is not suitable for permanent uploaded images. Menu/logo files uploaded from Admin can disappear after a restart/redeploy. The restaurant/order data is persistent because it is stored in Neon.
