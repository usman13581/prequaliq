const { test } = require('node:test');
const assert = require('node:assert/strict');
const { noticeEmail } = require('../services/emailService');

test('notice email shows the facts, steps and where to find it', () => {
  const html = noticeEmail({
    name: 'Erik',
    heading: 'Your bid has been submitted',
    intro: 'This is your receipt.',
    facts: [['Reference', 'REF-2026-1001'], ['Buyer', 'Lindholmen Municipal Property Services AB']],
    steps: ['Keep this email as proof of submission.'],
    where: 'Tenders',
    buttonText: 'View your bid'
  });
  for (const expected of ['Hello Erik', 'Your bid has been submitted', 'REF-2026-1001', 'Lindholmen Municipal Property Services AB', 'Keep this email as proof of submission.', '<strong>Tenders</strong>', 'View your bid']) {
    assert.ok(html.includes(expected), `missing: ${expected}`);
  }
});

test('notice email leaves out facts without a value', () => {
  const html = noticeEmail({ heading: 'h', intro: 'i', facts: [['Reference', null], ['Buyer', ''], ['Supplier', 'Hallberg']] });
  assert.ok(!html.includes('Reference'));
  assert.ok(!html.includes('Buyer'));
  assert.ok(html.includes('Hallberg'));
});

test('notice email escapes text written by users', () => {
  const html = noticeEmail({
    name: '<b>x</b>',
    heading: 'Update',
    intro: 'i',
    facts: [['Contract', 'Roof <script>alert(1)</script>']],
    quote: { label: 'Message', text: '<img src=x onerror=alert(1)> & more' }
  });
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('Roof &lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt; &amp; more'));
  assert.ok(html.includes('Hello &lt;b&gt;x&lt;/b&gt;'));
});

test('notice email greets a recipient without a name', () => {
  assert.ok(noticeEmail({ heading: 'h', intro: 'i' }).includes('Hello there'));
});
