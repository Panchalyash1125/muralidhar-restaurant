MURALIDHAR RESTAURANT - FIRST RUN
================================

1) Extract this ZIP.
2) Open PowerShell in this folder.
3) Run:
     npm install
4) Run:
     npm start
5) On the FIRST run only, it will ask:
     Neon DATABASE_URL:
   Go to Neon -> your project -> Connect -> copy the full Connection string
   (postgresql://...) and paste it in PowerShell, then press Enter.
6) The launcher saves it to a private .env file automatically and starts the server.
7) Open:
     http://localhost:3000/customer/index.html?table=1

IMPORTANT:
- Never upload .env to GitHub. A .gitignore file is already included.
- On Koyeb, set DATABASE_URL in Environment Variables. The terminal prompt is only for local first-run setup.
