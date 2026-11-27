const { test } = require('node:test');
const assert = require('node:assert/strict');
const { requestLanguage } = require('../utils/requestLanguage');

test('language given in the request body wins', () => {
  assert.equal(requestLanguage({ body: { language: 'sv' }, query: {}, headers: { 'accept-language': 'en' } }), 'sv');
});

test('falls back to the query, then to the Accept-Language header', () => {
  assert.equal(requestLanguage({ body: {}, query: { language: 'sv' }, headers: {} }), 'sv');
  assert.equal(requestLanguage({ body: {}, query: {}, headers: { 'accept-language': 'sv-SE,sv;q=0.9' } }), 'sv');
});

test('unsupported or missing languages become English', () => {
  assert.equal(requestLanguage({ body: { language: 'de' }, query: {}, headers: {} }), 'en');
  assert.equal(requestLanguage({ headers: {} }), 'en');
});
