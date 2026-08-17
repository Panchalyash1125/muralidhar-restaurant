# Active Table / Continue Order Fix

## What changed

- The open `bills` row is now the backend source of truth for a table's active unpaid session.
- Added `GET /api/tables/:tableNumber/active-order` so QR reloads and other phones restore the current running bill from PostgreSQL.
- `POST /api/orders` now locks the table row (`FOR UPDATE`) before checking/creating the open bill, reuses the bill/session for additional batches, and appends only the new batch.
- Additional orders keep the original table-session customer identity and use the same `session_id`.
- A stale Continue Order request carries `expected_bill_id`; if Counter already paid/closed that bill, the server returns HTTP 409 instead of accidentally starting a new session.
- Kitchen continues to receive separate `orders` rows (new items only) and labels later batches as `Additional Order`.
- Counter continues to merge all bill items by menu item, so repeat quantities are summed on the running bill, and explicitly shows the active bill as **Payment Status: Unpaid**.
- Counter payment closes the bill/session, frees the table, and completes any remaining active kitchen rows without deleting history.
- Customer entry/menu/cart pages display the active unpaid order from the backend. The cart shows Already Ordered Total + new batch = Updated Grand Total.
- Place Order remains button-only and the submit button is disabled while the request is in flight.

## Database migration

No schema migration is required. The existing `tables`, `orders`, `order_items`, `bills`, `bill_items`, `payments`, and `sessions` tables already support this lifecycle. Existing open bills that do not yet have a `sessions` row are repaired automatically when the next order is appended.

## Regression test

Run:

```bash
npm run test:active-session
```

The test covers the requested Tests 1-7, same-item quantity merge, kitchen additional-batch behavior, multi-table isolation, payment reset, and production-code contract safeguards.

> A live Neon integration test requires the real `DATABASE_URL`. The uploaded ZIP does not contain `.env`, so the included regression test does not connect to your production Neon database.

## Files changed

- `backend/server.js`
- `shared/js/utils.js`
- `customer/index.html`
- `customer/menu.html`
- `customer/cart.html`
- `customer/js/menu.js`
- `customer/js/cart.js`
- `customer/css/customer.css`
- `kitchen/js/kitchen.js`
- `counter/index.html`
- `counter/script.js`
- `package.json`
- `tests/active-table-session-regression.js` (new)
- `ACTIVE_TABLE_SESSION_FIX.md` (new)
