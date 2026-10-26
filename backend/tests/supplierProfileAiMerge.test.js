const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  mapExtractionToProfileFields,
  mergeProfileSuggestions,
} = require('../services/supplierProfileAiService');

describe('supplierProfileAiService merge', () => {
  it('mapExtractionToProfileFields maps insurance and company sections', () => {
    const insurance = mapExtractionToProfileFields('insurance', 'insurance', {
      insurerName: 'Trygg-Hansa',
      insurancePolicyNumber: 'POL-1',
      insuranceCoverageAmount: '10M',
      insuranceValidTo: '2027-01-01',
    });
    assert.equal(insurance.insurerName, 'Trygg-Hansa');
    assert.equal(insurance.insurancePolicyNumber, 'POL-1');

    const company = mapExtractionToProfileFields('company_registration', 'company', {
      companyName: 'Aurora IT AB',
      city: 'Uppsala',
      country: 'Sweden',
    });
    assert.equal(company.companyName, 'Aurora IT AB');
    assert.equal(company.city, 'Uppsala');
  });

  it('mergeProfileSuggestions picks highest confidence and records conflicts', () => {
    const { suggestions, conflicts } = mergeProfileSuggestions(
      [
        {
          fileName: 'a.pdf',
          documentType: 'company_registration',
          section: 'company',
          confidence: 0.6,
          fields: { companyName: 'Aurora', city: 'Uppsala' },
        },
        {
          fileName: 'b.pdf',
          documentType: 'company_registration',
          section: 'company',
          confidence: 0.9,
          fields: { companyName: 'Aurora IT AB', city: 'Uppsala' },
        },
      ],
      { companyName: 'Old Name', city: 'Uppsala' }
    );

    assert.equal(suggestions.companyName.value, 'Aurora IT AB');
    assert.equal(suggestions.companyName.confidence, 0.9);
    assert.equal(suggestions.companyName.differsFromCurrent, true);
    assert.equal(suggestions.city.differsFromCurrent, false);
    assert.ok(conflicts.some((c) => c.field === 'companyName'));
  });
});
