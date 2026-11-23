const test = require('node:test');
const assert = require('node:assert/strict');

const pricing = require('../lib/pricing');
const invoice = require('../lib/invoice');
const reports = require('../lib/reports');

function riceItem() {
  return {
    id: 1,
    sku: 'GRN-001',
    name: 'Indrayani Basmati Rice 5kg',
    hsn: '1006',
    price: 640,
    qty: 1
  };
}

test('CURRENT BEHAVIOUR: pricing uses the HSN GST slab for an order line', () => {
  const totals = pricing.computeTotals([riceItem()], '');

  assert.equal(totals.subtotal, 640);
  assert.equal(totals.discount, 0);
  assert.equal(totals.tax, 32);
  assert.equal(totals.total, 672);
  assert.equal(totals.lines[0].gstPercent, 5);
});

test('invoice calculation uses the same HSN GST slab as the order ledger', () => {
  const figures = invoice.computeInvoiceFigures({
    items: [riceItem()],
    coupon: ''
  });

  assert.equal(figures.subtotal, 640);
  assert.equal(figures.discount, 0);
  assert.equal(figures.tax, 32);
  assert.equal(figures.total, 672);
  assert.equal(figures.rows[0].gstPercent, 5);
});

test('invoice calculation applies the same coupon discount and taxable base as the order ledger', () => {
  const items = [riceItem()];
  const ledgerTotals = pricing.computeTotals(items, 'SAVE10');
  const invoiceFigures = invoice.computeInvoiceFigures({ items, coupon: 'SAVE10' });

  assert.equal(ledgerTotals.discount, 64);
  assert.equal(ledgerTotals.tax, 28.8);
  assert.equal(ledgerTotals.total, 604.8);

  assert.equal(invoiceFigures.discount, 64);
  assert.equal(invoiceFigures.tax, 28.8);
  assert.equal(invoiceFigures.total, 604.8);
});

test('reconciliation matches an in-memory order when invoice and ledger use the same totals', () => {
  const db = {
    orders: [{
      id: 9001,
      date: '01/01/2022',
      customer: 'Test Customer',
      coupon: 'SAVE10',
      items: [riceItem()],
      subtotal: 640,
      discount: 64,
      tax: 28.8,
      total: 604.8,
      status: 'completed'
    }]
  };

  const reconciliation = reports.getGstReconciliation(db);

  assert.equal(reconciliation.totalChecked, 1);
  assert.equal(reconciliation.mismatchCount, 0);
  assert.equal(reconciliation.totalDelta, 0);
  assert.equal(reconciliation.rows[0].matched, true);
  assert.equal(reconciliation.rows[0].invoiceTax, 28.8);
  assert.equal(reconciliation.rows[0].invoiceTotal, 604.8);
  assert.equal(reconciliation.rows[0].delta, 0);
});
