const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeCpvCode,
  extractExplicitCpvCodes,
  prioritizeBusinessText,
  extractSearchTerms,
  resolveAiCpvPicks,
  refineByDivision,
  isBroadDivisionCode,
} = require('../services/cpvSearchService');

describe('cpvSearchService', () => {
  it('normalizeCpvCode pads and slices to 8 digits', () => {
    assert.equal(normalizeCpvCode('72'), '72000000');
    assert.equal(normalizeCpvCode('72000000'), '72000000');
    assert.equal(normalizeCpvCode('CPV 72212345-extra'), '72212345');
    assert.equal(normalizeCpvCode('x'), null);
  });

  it('extractExplicitCpvCodes prefers CPV section and skips turnover amounts', () => {
    const text = `
      Annual turnover: 42000000 SEK
      Business activities / Primary CPV codes: 72000000, 72200000
      Employees: 12000000
    `;
    const codes = extractExplicitCpvCodes(text);
    assert.ok(codes.includes('72000000'));
    assert.ok(codes.includes('72200000'));
    assert.ok(!codes.includes('42000000'));
  });

  it('prioritizeBusinessText surfaces activity chunk over registration boilerplate', () => {
    const text = `
      Company name: Aurora AB
      Registration number: 556000-0000
      Address: Stockholm
      Business activities: Managed IT services, cloud hosting, cybersecurity and software development.
      Directors: Sample Director
    `;
    const prioritized = prioritizeBusinessText(text);
    assert.match(prioritized.toLowerCase(), /managed it services/);
    assert.ok(prioritized.toLowerCase().indexOf('managed it') < prioritized.toLowerCase().indexOf('directors'));
  });

  it('extractSearchTerms keeps IT short token and drops stop words', () => {
    const terms = extractSearchTerms('IT services and software consulting for suppliers');
    assert.ok(terms.includes('it') || terms.some((t) => t.includes('it')));
    assert.ok(terms.includes('software') || terms.some((t) => t.includes('software')));
    assert.ok(!terms.includes('and'));
    assert.ok(!terms.includes('supplier') && !terms.includes('suppliers'));
  });

  it('resolveAiCpvPicks keeps catalog-only codes and dedupes', () => {
    const candidates = [
      { cpvCodeId: 1, code: '72000000', description: 'IT', reason: 'match', confidence: 0.7 },
      { cpvCodeId: 2, code: '72200000', description: 'Software', reason: 'match', confidence: 0.6 },
    ];
    const picks = resolveAiCpvPicks(
      [
        { code: '72000000', reason: 'AI IT' },
        { code: '99999999', reason: 'hallucinated' },
        { code: '72000000', reason: 'dup' },
        { code: '72200000', reason: 'AI software' },
      ],
      candidates
    );
    assert.equal(picks.length, 2);
    assert.equal(picks[0].code, '72000000');
    assert.equal(picks[0].reason, 'AI IT');
    assert.ok(picks[0].confidence > 0.7);
    assert.equal(picks[1].code, '72200000');
  });

  it('refineByDivision prefers specific codes over XX000000 when both match', () => {
    assert.equal(isBroadDivisionCode('72000000'), true);
    assert.equal(isBroadDivisionCode('72212300'), false);

    const ranked = refineByDivision([
      { row: { code: '72000000' }, score: 5, supplierCount: 10 },
      { row: { code: '72200000' }, score: 4, supplierCount: 2 },
      { row: { code: '90910000' }, score: 3, supplierCount: 0 },
    ]);
    const codes = ranked.map((r) => r.row.code);
    assert.ok(codes.includes('72200000'));
    assert.ok(!codes.includes('72000000') || codes.indexOf('72200000') < codes.indexOf('72000000'));
  });
});
