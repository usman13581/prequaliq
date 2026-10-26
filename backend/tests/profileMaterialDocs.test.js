const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isProfileMaterialDocumentType } = require('../utils/profileMaterialDocs');

describe('isProfileMaterialDocumentType', () => {
  it('does not treat questionnaire or bid uploads as material', () => {
    assert.equal(isProfileMaterialDocumentType('questionnaire_answer'), false);
    assert.equal(isProfileMaterialDocumentType('questionnaire_answer_q3'), false);
    assert.equal(isProfileMaterialDocumentType('bid:technical'), false);
    assert.equal(isProfileMaterialDocumentType('qa-thread'), false);
    assert.equal(isProfileMaterialDocumentType(''), false);
    assert.equal(isProfileMaterialDocumentType(null), false);
  });

  it('flags profile qualification document types for reapproval', () => {
    assert.equal(isProfileMaterialDocumentType('insurance'), true);
    assert.equal(isProfileMaterialDocumentType('company_registration'), true);
    assert.equal(isProfileMaterialDocumentType('q5-quality'), true);
    assert.equal(isProfileMaterialDocumentType('q2-financial'), true);
    assert.equal(isProfileMaterialDocumentType('general'), true);
    assert.equal(isProfileMaterialDocumentType('INSURANCE'), true);
  });
});
