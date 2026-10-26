const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { valuesDiffer, supplierMaterialFieldsChanged } = require('../utils/supplierMaterialDiff');

describe('supplierMaterialDiff', () => {
  it('valuesDiffer treats null and empty as equal', () => {
    assert.equal(valuesDiffer(null, ''), false);
    assert.equal(valuesDiffer('', null), false);
    assert.equal(valuesDiffer(undefined, null), false);
    assert.equal(valuesDiffer('A', 'A'), false);
    assert.equal(valuesDiffer('A', 'B'), true);
    assert.equal(valuesDiffer(1, '1'), false);
  });

  it('supplierMaterialFieldsChanged detects real profile edits', () => {
    const supplier = {
      getDataValue(key) {
        return { companyName: 'Aurora', city: 'Uppsala', phone: null }[key];
      },
    };
    assert.equal(supplierMaterialFieldsChanged(supplier, { companyName: 'Aurora' }), false);
    assert.equal(supplierMaterialFieldsChanged(supplier, { phone: '' }), false);
    assert.equal(supplierMaterialFieldsChanged(supplier, { city: 'Stockholm' }), true);
  });
});
