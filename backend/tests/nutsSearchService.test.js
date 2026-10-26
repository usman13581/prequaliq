const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { extractCityHints, detectCountryPrefix } = require('../services/nutsSearchService');

describe('nutsSearchService', () => {
  it('extractCityHints reads labeled city and known Swedish cities', () => {
    const labeled = extractCityHints('City: Uppsala Country: Sweden');
    assert.ok(labeled.includes('uppsala'));

    const free = extractCityHints('Office in Stockholm and Göteborg');
    assert.ok(free.includes('stockholm'));
    assert.ok(free.includes('göteborg') || free.includes('goteborg'));
  });

  it('detectCountryPrefix maps Nordic country names', () => {
    assert.equal(detectCountryPrefix('Registered in Sverige'), 'SE');
    assert.equal(detectCountryPrefix('Norway branch'), 'NO');
    assert.equal(detectCountryPrefix('Danmark HQ'), 'DK');
    assert.equal(detectCountryPrefix('Suomi office'), 'FI');
  });
});
