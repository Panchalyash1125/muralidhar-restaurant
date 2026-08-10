# Stable Menu + Cart Fix

Fixes:
- Temporary 429/network failures no longer replace the menu with an empty list.
- Last known good Neon menu is cached only as a fallback while Render wakes up.
- Cart is not erased when a menu refresh temporarily fails.
- Polling reduced from 10 seconds to 60 seconds; Socket.IO remains realtime primary sync.
- Menu DOM is not re-rendered when server data has not changed, reducing blank/flicker.
- API read rate limit default increased to 5000 per 15 minutes; writes use a separate 500 limit.

Render environment variables recommended:
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5000
RATE_LIMIT_WRITE_MAX_REQUESTS=500
