const { test } = require('node:test');
const assert = require('node:assert/strict');

// The controller loads the database models on require; the two helpers under test do not use them.
const { upcoming, stillSealed } = require('../controllers/homeController');

const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

test('upcoming dates drop past and empty dates and come soonest first', () => {
  const list = upcoming([
    { kind: 'bid_deadline', date: day(5) },
    { kind: 'qa_deadline', date: day(-1) },
    { kind: 'contract_end', date: null },
    { kind: 'standstill_end', date: day(0) },
    { kind: 'qa_deadline', date: day(2) }
  ]);
  assert.deepEqual(list.map((e) => e.kind), ['standstill_end', 'qa_deadline', 'bid_deadline']);
});

test('upcoming dates are capped', () => {
  const many = Array.from({ length: 10 }, (_, i) => ({ kind: 'bid_deadline', date: day(i + 1) }));
  assert.equal(upcoming(many, 3).length, 3);
});

test('bids stay sealed until the sealing time has passed', () => {
  const now = new Date('2026-12-01T12:00:00Z');
  assert.equal(stillSealed({ isSealed: true, sealedUntil: '2026-12-07T23:59:59Z' }, now), true);
  assert.equal(stillSealed({ isSealed: true, sealedUntil: '2026-11-30T23:59:59Z' }, now), false);
  assert.equal(stillSealed({ isSealed: true, sealedUntil: null }, now), true);
  assert.equal(stillSealed({ isSealed: false, sealedUntil: '2026-12-07T23:59:59Z' }, now), false);
});
