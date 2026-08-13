# Repeat Order + Mobile Place Order + Counter Name Fix

Changes in this build:

1. **Order can be placed only with the orange `Place Order` button.**
   - Mobile keyboard Enter/Go/Arrow no longer submits the order.
   - The visible button uses an explicit click handler.

2. **Counter shows customer name + mobile number.**
   - New bills store `customer_name` in Neon.
   - Counter cards and bill modal show both Name and Mobile.

3. **Continue Order stays on the same running table bill.**
   - Cart is cleared after each submitted order, but the table session is preserved.
   - Backend already keeps one open bill per table and appends repeat orders to it.
   - Previous + new items remain merged in Counter until the bill is completed/paid there.

4. **Table reset behavior.**
   - Kitchen status changes do not free/reset the table.
   - Counter `Mark as Paid` / bill close frees the table and ends the server-side running bill.
