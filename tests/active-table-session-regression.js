const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const serverSource = fs.readFileSync(path.join(ROOT, 'backend', 'server.js'), 'utf8');
const cartSource = fs.readFileSync(path.join(ROOT, 'customer', 'js', 'cart.js'), 'utf8');
const kitchenSource = fs.readFileSync(path.join(ROOT, 'kitchen', 'js', 'kitchen.js'), 'utf8');
const counterSource = fs.readFileSync(path.join(ROOT, 'counter', 'script.js'), 'utf8');

// Production-code contract checks. These fail if the core safeguards are removed.
assert(serverSource.includes("/api/tables/:tableNumber/active-order"), 'active table order endpoint is missing');
assert(serverSource.includes('WHERE table_number = ?\n        FOR UPDATE'), 'table-level transaction lock is missing');
assert(serverSource.includes('expected_bill_id'), 'stale Continue Order protection is missing');
assert(serverSource.includes('INSERT INTO bill_items (bill_id, order_id)'), 'orders are not linked to the running bill');
assert(serverSource.includes('grand_total = grand_total + ?'), 'running bill total append is missing');
assert(serverSource.includes("UPDATE sessions SET is_active = 0"), 'payment does not close the session');
assert(serverSource.includes("UPDATE tables SET status = 'available'"), 'payment does not free the table');
assert(serverSource.includes("JOIN bills b ON b.id = bi.bill_id AND b.status = 'open'"), 'kitchen is not scoped to open table bills');
assert(cartSource.includes('ActiveTableOrder.refresh(table)'), 'customer does not restore active order from backend');
assert(cartSource.includes('expected_bill_id: ActiveCartOrder.isActive ? ActiveCartOrder.billId : null'), 'customer does not bind Continue Order to loaded bill');
assert(cartSource.includes('directPlaceOrderBtn.disabled'), 'button double-submit guard is missing');
assert(kitchenSource.includes('Additional Order'), 'kitchen additional-order label is missing');
assert(counterSource.includes('bill-payment-status'), 'counter unpaid payment status display is missing');

// Exact requested lifecycle simulation (quantities only; prices are irrelevant to merge correctness).
class TableSessionModel {
  constructor() {
    this.activeByTable = new Map();
    this.history = [];
    this.kitchenBatches = [];
    this.nextBillId = 1;
  }

  place(table, items) {
    let bill = this.activeByTable.get(table);
    const isAdditional = Boolean(bill);
    if (!bill) {
      bill = { id: this.nextBillId++, table, items: new Map(), paid: false };
      this.activeByTable.set(table, bill);
    }
    for (const item of items) {
      bill.items.set(item.name, (bill.items.get(item.name) || 0) + item.quantity);
    }
    this.kitchenBatches.push({ table, isAdditional, items: items.map(i => ({ ...i })) });
    return bill;
  }

  reopen(table) {
    return this.activeByTable.get(table) || null;
  }

  pay(table) {
    const bill = this.activeByTable.get(table);
    assert(bill, `No active bill for Table ${table}`);
    bill.paid = true;
    this.history.push(bill);
    this.activeByTable.delete(table);
  }

  quantities(table) {
    const bill = this.reopen(table);
    return bill ? Object.fromEntries(bill.items.entries()) : {};
  }
}

const model = new TableSessionModel();

// Test 1
model.place(1, [{ name: 'Poha', quantity: 2 }, { name: 'Tea', quantity: 1 }]);
assert.deepStrictEqual(model.quantities(1), { Poha: 2, Tea: 1 });
assert.deepStrictEqual(model.kitchenBatches[0].items, [
  { name: 'Poha', quantity: 2 },
  { name: 'Tea', quantity: 1 }
]);
assert.strictEqual(model.kitchenBatches[0].isAdditional, false);

// Test 2
assert.deepStrictEqual(model.quantities(1), { Poha: 2, Tea: 1 });

// Test 3
model.place(1, [{ name: 'Sandwich', quantity: 1 }]);
assert.deepStrictEqual(model.quantities(1), { Poha: 2, Tea: 1, Sandwich: 1 });
assert.deepStrictEqual(model.kitchenBatches[1].items, [{ name: 'Sandwich', quantity: 1 }]);
assert.strictEqual(model.kitchenBatches[1].isAdditional, true);

// Test 4
assert.deepStrictEqual(model.quantities(1), { Poha: 2, Tea: 1, Sandwich: 1 });

// Test 5
model.place(1, [{ name: 'Poha', quantity: 1 }]);
assert.deepStrictEqual(model.quantities(1), { Poha: 3, Tea: 1, Sandwich: 1 });
assert.deepStrictEqual(model.kitchenBatches[2].items, [{ name: 'Poha', quantity: 1 }]);

// Multiple tables remain isolated.
model.place(2, [{ name: 'Coffee', quantity: 2 }]);
assert.deepStrictEqual(model.quantities(2), { Coffee: 2 });
assert.deepStrictEqual(model.quantities(1), { Poha: 3, Tea: 1, Sandwich: 1 });

// Test 6
model.pay(1);
assert.strictEqual(model.reopen(1), null);

// Test 7
const newBill = model.place(1, [{ name: 'Tea', quantity: 1 }]);
assert.deepStrictEqual(model.quantities(1), { Tea: 1 });
assert.strictEqual(newBill.id, 3, 'Table 1 should get a brand-new bill after payment');

console.log('PASS: Active Table Session Tests 1-7 + multi-table isolation contract checks');
