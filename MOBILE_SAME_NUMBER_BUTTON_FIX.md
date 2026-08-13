# Mobile same-number Place Order button fix

- Same phone number is explicitly allowed for repeat orders.
- Customer input form submission is blocked so mobile keyboard Enter/Go/Arrow cannot place an order.
- The orange Place Order button listens on pointerdown, which works even while the numeric keyboard is open.
- A short gesture lock prevents pointerdown + synthetic click from creating duplicate orders.
- Backend continues to append repeat orders from the same table to the existing open bill until Counter closes it.
