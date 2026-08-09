# Order placement foreign-key fix

## Root cause
The customer menu uses LocalStorage IDs, while `order_items.menu_item_id` is a foreign key to SQLite `menu_items.id`. A LocalStorage dish ID therefore did not always exist in SQLite, causing `SQLITE_CONSTRAINT_FOREIGNKEY` at order insertion.

## Fix
- Customer cart now sends dish metadata along with the client-side ID.
- Backend resolves the SQLite menu row by verified ID + name, then by name, or creates a backend mirror row when missing.
- Order creation is wrapped in a SQLite transaction, so failed orders no longer leave partial orders or bills behind.
- Totals are recalculated on the server.
- Quantity and price are validated before insertion.

## Run
Stop the old server, extract this fixed project, then run `npm install` (if needed) and `npm start`.
