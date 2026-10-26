const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { contractIsWritable } = require('../utils/contractWriteAccess');

describe('contractIsWritable', () => {
  it('only active contracts are writable', () => {
    assert.equal(contractIsWritable({ status: 'active' }), true);
    assert.equal(contractIsWritable({ status: 'completed' }), false);
    assert.equal(contractIsWritable({ status: 'draft' }), false);
    assert.equal(contractIsWritable(null), false);
  });
});
