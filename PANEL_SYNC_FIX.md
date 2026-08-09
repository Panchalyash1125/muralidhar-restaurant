# Kitchen and Admin Panel Sync Fix

## Root causes

1. Express route ordering caused `GET /api/orders/active` to be captured by the dynamic `GET /api/orders/:id` route. The word `active` was treated as an order ID, so the Kitchen panel could not load active orders.
2. The Admin dashboard only refreshed every 30 seconds and did not join a Socket.IO room, so new orders were not reflected immediately.

## Fixes

- Restricted the order-by-ID route to numeric IDs only: `/api/orders/:id(\\d+)`.
- Added the Socket.IO client to Admin dashboard.
- Added an Admin room connection and immediate dashboard refresh events.
- Server now emits `dashboard_update` after order creation and order status changes.
- Existing 30-second polling remains as a fallback.
