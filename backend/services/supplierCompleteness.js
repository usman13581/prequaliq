const REQUIRED_DOC_TYPES = {
  q2: 'q2-financial',
  q5: 'q5-quality',
  q6: 'q6-environment',
  q7: 'q7-social',
  q8: 'q8-ohs'
};

const TEXT_FIELDS = {
  q2: 'financialStability',
  q5: 'qualityManagementSystem',
  q6: 'environmentalManagementSystem',
  q7: 'socialResponsibilityManagementSystem',
  q8: 'ohsManagementSystem',
  q9: 'groundsForExclusion',
  q10: 'laborLawRegulations',
  q11: 'sanctionsRussiaBelarus',
  q12: 'technicalCapacityProfessionalExperience'
};

function isNonEmpty(value) {
  return value != null && String(value).trim() !== '';
}

function getDocumentStatus(doc) {
  if (!doc || doc.isActive === false) return 'missing';
  if (!doc.validTo) return 'valid';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(doc.validTo);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'expiring_soon';
  return 'valid';
}

function getActiveDocuments(documents = []) {
  return documents.filter((d) => d.isActive !== false);
}

function findActiveDocByType(documents, type) {
  return getActiveDocuments(documents).find((d) => d.documentType === type);
}

function evaluateSupplierCompleteness(supplier) {
  const documents = supplier.documents || [];
  const cpvCodes = supplier.cpvCodes || [];
  const nutsCodes = supplier.nutsCodes || [];
  const references = supplier.references || [];

  const sections = [];
  const blockers = [];

  const companyMissing = [];
  if (!isNonEmpty(supplier.companyName)) companyMissing.push('companyName');
  if (!isNonEmpty(supplier.registrationNumber)) companyMissing.push('registrationNumber');
  if (!isNonEmpty(supplier.address)) companyMissing.push('address');
  if (!isNonEmpty(supplier.city)) companyMissing.push('city');
  if (!isNonEmpty(supplier.country)) companyMissing.push('country');
  if (supplier.turnover == null || supplier.turnover === '') companyMissing.push('turnover');
  sections.push({
    id: 'company',
    label: 'Company information',
    complete: companyMissing.length === 0,
    missing: companyMissing
  });
  if (companyMissing.length) blockers.push('Complete company information');

  Object.entries(TEXT_FIELDS).forEach(([key, field]) => {
    const hasText = isNonEmpty(supplier[field]);
    const docType = REQUIRED_DOC_TYPES[key];
    const doc = docType ? findActiveDocByType(documents, docType) : null;
    const docStatus = docType ? getDocumentStatus(doc) : 'n/a';
    const needsDoc = Boolean(docType);
    const docOk = !needsDoc || (doc && docStatus !== 'expired');
    const complete = hasText && docOk;
    const missing = [];
    if (!hasText) missing.push('answer');
    if (needsDoc && !doc) missing.push('document');
    if (needsDoc && doc && docStatus === 'expired') missing.push('expired_document');
    if (needsDoc && doc && docStatus === 'expiring_soon') missing.push('expiring_soon');
    sections.push({
      id: key,
      label: `Question ${key.slice(1)}`,
      complete,
      missing,
      documentStatus: docStatus
    });
    if (!hasText) blockers.push(`Answer question ${key.slice(1)}`);
    if (needsDoc && !doc) blockers.push(`Upload document for question ${key.slice(1)}`);
    if (needsDoc && doc && docStatus === 'expired') blockers.push(`Renew expired document for question ${key.slice(1)}`);
  });

  const cpvOk = cpvCodes.length > 0;
  sections.push({ id: 'cpv', label: 'CPV codes', complete: cpvOk, missing: cpvOk ? [] : ['cpv'] });
  if (!cpvOk) blockers.push('Select at least one CPV code');

  const nutsOk = nutsCodes.length > 0;
  sections.push({ id: 'nuts', label: 'NUTS regions', complete: nutsOk, missing: nutsOk ? [] : ['nuts'] });
  if (!nutsOk) blockers.push('Select at least one NUTS region');

  const refsOk = references.length > 0 || isNonEmpty(supplier.technicalCapacityProfessionalExperience);
  sections.push({
    id: 'references',
    label: 'References / technical capacity',
    complete: refsOk,
    missing: refsOk ? [] : ['reference_or_q12']
  });
  if (!refsOk) blockers.push('Add at least one reference or complete question 12');

  const insuranceOk = isNonEmpty(supplier.insurerName) && isNonEmpty(supplier.insurancePolicyNumber);
  sections.push({
    id: 'insurance',
    label: 'Insurance',
    complete: insuranceOk,
    missing: insuranceOk ? [] : ['insurance']
  });
  if (!insuranceOk) blockers.push('Complete insurance information');

  const completedCount = sections.filter((s) => s.complete).length;
  const percent = Math.round((completedCount / sections.length) * 100);
  const readyToSubmit = blockers.filter((b) => !b.includes('expiring')).length === 0 && percent === 100;

  const activeDocs = getActiveDocuments(documents);
  const expiringCount = activeDocs.filter((d) => getDocumentStatus(d) === 'expiring_soon').length;
  const expiredCount = activeDocs.filter((d) => getDocumentStatus(d) === 'expired').length;
  const missingDocCount = Object.values(REQUIRED_DOC_TYPES).filter((type) => !findActiveDocByType(documents, type)).length;

  return {
    percent,
    readyToSubmit,
    sections,
    blockers: [...new Set(blockers)],
    documents: {
      expiringCount,
      expiredCount,
      missingCount: missingDocCount,
      totalActive: activeDocs.length
    }
  };
}

module.exports = {
  REQUIRED_DOC_TYPES,
  getDocumentStatus,
  evaluateSupplierCompleteness
};
