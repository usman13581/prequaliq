const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { valuesDiffer, supplierMaterialFieldsChanged, idSetsDiffer } = require('../utils/supplierMaterialDiff');

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
        return { companyName: 'Aurora', city: 'Uppsala', phone: null, taxId: 'SE1' }[key];
      },
    };
    assert.equal(supplierMaterialFieldsChanged(supplier, { companyName: 'Aurora' }), false);
    assert.equal(supplierMaterialFieldsChanged(supplier, { phone: '' }), false);
    // Name, address and phone never trigger re-approval
    assert.equal(supplierMaterialFieldsChanged(supplier, { city: 'Stockholm' }), false);
    assert.equal(supplierMaterialFieldsChanged(supplier, { companyName: 'Aurora IT', phone: '+46 1' }), false);
    // Registration details and qualification answers do
    assert.equal(supplierMaterialFieldsChanged(supplier, { taxId: 'SE2' }), true);
    assert.equal(supplierMaterialFieldsChanged(supplier, { city: 'Stockholm', insurerName: 'If' }), true);
  });

  it('idSetsDiffer ignores order and duplicates', () => {
    assert.equal(idSetsDiffer(['a', 'b'], ['b', 'a']), false);
    assert.equal(idSetsDiffer(['a'], ['a', 'a']), false);
    assert.equal(idSetsDiffer(['a'], ['a', 'b']), true);
    assert.equal(idSetsDiffer([], []), false);
  });
});
