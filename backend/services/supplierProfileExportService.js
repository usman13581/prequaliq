const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const LABELS = {
  en: {
    title: 'Supplier Qualification Profile',
    exportedAt: 'Exported at',
    status: 'Qualification status',
    completeness: 'Profile completeness',
    readyToSubmit: 'Ready to submit',
    sectionCompany: 'Company information',
    sectionContact: 'Contact person',
    sectionQualification: 'Qualification answers',
    sectionInsurance: 'Insurance',
    sectionCpv: 'CPV codes',
    sectionNuts: 'NUTS regions',
    sectionReferences: 'Project references',
    sectionDocuments: 'Documents',
    yes: 'Yes',
    no: 'No',
    fields: {
      companyName: 'Company name',
      registrationNumber: 'Registration number',
      taxId: 'Tax ID',
      address: 'Address',
      city: 'City',
      country: 'Country',
      phone: 'Phone',
      website: 'Website',
      turnover: 'Turnover (SEK)',
      employeeCount: 'Employees',
      yearEstablished: 'Year established',
      financialStability: 'Q2 – Financial stability',
      qualityManagementSystem: 'Q5 – Quality management',
      environmentalManagementSystem: 'Q6 – Environment',
      socialResponsibilityManagementSystem: 'Q7 – Social responsibility',
      ohsManagementSystem: 'Q8 – Occupational health & safety',
      groundsForExclusion: 'Q9 – Grounds for exclusion',
      laborLawRegulations: 'Q10 – Labor law',
      sanctionsRussiaBelarus: 'Q11 – Sanctions',
      technicalCapacityProfessionalExperience: 'Q12 – Technical capacity',
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      insurerName: 'Insurer',
      insurancePolicyNumber: 'Policy number',
      insuranceCoverageAmount: 'Coverage amount',
      insuranceValidTo: 'Valid until',
      qualifiedAt: 'Qualified on',
      qualificationExpiresAt: 'Qualification expires',
      profileVersion: 'Profile version',
      profileSubmittedAt: 'Submitted at'
    },
    refProject: 'Project',
    refClient: 'Client',
    refYears: 'Years',
    refValue: 'Contract value',
    refContact: 'Contact',
    docFile: 'File',
    docType: 'Type',
    docValidFrom: 'Valid from',
    docValidTo: 'Valid to',
    docIssuer: 'Issuer',
    docNumber: 'Document number'
  },
  sv: {
    title: 'Leverantörs kvalificeringsprofil',
    exportedAt: 'Exporterad',
    status: 'Kvalificeringsstatus',
    completeness: 'Profilkomplettering',
    readyToSubmit: 'Redo att skicka in',
    sectionCompany: 'Företagsinformation',
    sectionContact: 'Kontaktperson',
    sectionQualification: 'Kvalificeringssvar',
    sectionInsurance: 'Försäkring',
    sectionCpv: 'CPV-koder',
    sectionNuts: 'NUTS-regioner',
    sectionReferences: 'Projektreferenser',
    sectionDocuments: 'Dokument',
    yes: 'Ja',
    no: 'Nej',
    fields: {
      companyName: 'Företagsnamn',
      registrationNumber: 'Organisationsnummer',
      taxId: 'Momsregistreringsnummer',
      address: 'Adress',
      city: 'Stad',
      country: 'Land',
      phone: 'Telefon',
      website: 'Webbplats',
      turnover: 'Omsättning (SEK)',
      employeeCount: 'Antal anställda',
      yearEstablished: 'Grundat år',
      financialStability: 'F2 – Ekonomisk stabilitet',
      qualityManagementSystem: 'F5 – Kvalitetsledning',
      environmentalManagementSystem: 'F6 – Miljö',
      socialResponsibilityManagementSystem: 'F7 – Socialt ansvar',
      ohsManagementSystem: 'F8 – Arbetsmiljö',
      groundsForExclusion: 'F9 – Uteslutningsgrunder',
      laborLawRegulations: 'F10 – Arbetsrätt',
      sanctionsRussiaBelarus: 'F11 – Sanktioner',
      technicalCapacityProfessionalExperience: 'F12 – Teknisk kapacitet',
      firstName: 'Förnamn',
      lastName: 'Efternamn',
      email: 'E-post',
      insurerName: 'Försäkringsbolag',
      insurancePolicyNumber: 'Policynummer',
      insuranceCoverageAmount: 'Försäkringsbelopp',
      insuranceValidTo: 'Giltig till',
      qualifiedAt: 'Kvalificerad',
      qualificationExpiresAt: 'Kvalificering går ut',
      profileVersion: 'Profilversion',
      profileSubmittedAt: 'Inskickad'
    },
    refProject: 'Projekt',
    refClient: 'Beställare',
    refYears: 'År',
    refValue: 'Kontraktsvärde',
    refContact: 'Kontakt',
    docFile: 'Fil',
    docType: 'Typ',
    docValidFrom: 'Giltig från',
    docValidTo: 'Giltig till',
    docIssuer: 'Utfärdare',
    docNumber: 'Dokumentnummer'
  }
};

function getLabels(lang) {
  return LABELS[lang === 'sv' ? 'sv' : 'en'];
}

function fmt(value) {
  if (value == null || value === '') return '—';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value);
}

function fmtDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('sv-SE');
  } catch {
    return fmt(value);
  }
}

function buildExportSections(supplier, completeness, lang) {
  const L = getLabels(lang);
  const s = supplier.toJSON ? supplier.toJSON() : supplier;
  const user = s.user || {};
  const sections = [];

  const addSection = (title, rows) => {
    sections.push({ title, rows: rows.filter((r) => r.value !== undefined) });
  };

  addSection(L.sectionCompany, [
    { field: L.fields.companyName, value: fmt(s.companyName) },
    { field: L.fields.registrationNumber, value: fmt(s.registrationNumber) },
    { field: L.fields.taxId, value: fmt(s.taxId) },
    { field: L.fields.address, value: fmt(s.address) },
    { field: L.fields.city, value: fmt(s.city) },
    { field: L.fields.country, value: fmt(s.country) },
    { field: L.fields.phone, value: fmt(s.phone) },
    { field: L.fields.website, value: fmt(s.website) },
    { field: L.fields.turnover, value: fmt(s.turnover) },
    { field: L.fields.employeeCount, value: fmt(s.employeeCount) },
    { field: L.fields.yearEstablished, value: fmt(s.yearEstablished) }
  ]);

  addSection(L.sectionContact, [
    { field: L.fields.firstName, value: fmt(user.firstName) },
    { field: L.fields.lastName, value: fmt(user.lastName) },
    { field: L.fields.email, value: fmt(user.email) },
    { field: L.fields.phone, value: fmt(user.phone) }
  ]);

  addSection(L.sectionQualification, [
    { field: L.status, value: fmt(s.status) },
    { field: L.fields.qualifiedAt, value: fmtDate(s.qualifiedAt) },
    { field: L.fields.qualificationExpiresAt, value: fmtDate(s.qualificationExpiresAt) },
    { field: L.fields.profileVersion, value: fmt(s.profileVersion) },
    { field: L.fields.profileSubmittedAt, value: fmtDate(s.profileSubmittedAt) },
    { field: L.completeness, value: completeness ? `${completeness.percent}%` : '—' },
    { field: L.readyToSubmit, value: completeness?.readyToSubmit ? L.yes : L.no },
    { field: L.fields.financialStability, value: fmt(s.financialStability) },
    { field: L.fields.qualityManagementSystem, value: fmt(s.qualityManagementSystem) },
    { field: L.fields.environmentalManagementSystem, value: fmt(s.environmentalManagementSystem) },
    { field: L.fields.socialResponsibilityManagementSystem, value: fmt(s.socialResponsibilityManagementSystem) },
    { field: L.fields.ohsManagementSystem, value: fmt(s.ohsManagementSystem) },
    { field: L.fields.groundsForExclusion, value: fmt(s.groundsForExclusion) },
    { field: L.fields.laborLawRegulations, value: fmt(s.laborLawRegulations) },
    { field: L.fields.sanctionsRussiaBelarus, value: fmt(s.sanctionsRussiaBelarus) },
    { field: L.fields.technicalCapacityProfessionalExperience, value: fmt(s.technicalCapacityProfessionalExperience) }
  ]);

  addSection(L.sectionInsurance, [
    { field: L.fields.insurerName, value: fmt(s.insurerName) },
    { field: L.fields.insurancePolicyNumber, value: fmt(s.insurancePolicyNumber) },
    { field: L.fields.insuranceCoverageAmount, value: fmt(s.insuranceCoverageAmount) },
    { field: L.fields.insuranceValidTo, value: fmtDate(s.insuranceValidTo) }
  ]);

  const cpvRows = (s.cpvCodes || []).map((c) => ({
    field: c.code,
    value: fmt(c.description)
  }));
  if (cpvRows.length) addSection(L.sectionCpv, cpvRows);

  const nutsRows = (s.nutsCodes || []).map((n) => ({
    field: n.code,
    value: fmt(n.name || n.nameSwedish)
  }));
  if (nutsRows.length) addSection(L.sectionNuts, nutsRows);

  const refRows = [];
  (s.references || []).forEach((ref, i) => {
    const years = [ref.yearFrom, ref.yearTo].filter(Boolean).join('–') || '—';
    const contact = [ref.contactName, ref.contactEmail, ref.contactPhone].filter(Boolean).join(' · ') || '—';
    refRows.push(
      { field: `${L.refProject} ${i + 1}`, value: fmt(ref.projectName) },
      { field: `${L.refClient} ${i + 1}`, value: fmt(ref.clientName) },
      { field: `${L.refYears} ${i + 1}`, value: years },
      { field: `${L.refValue} ${i + 1}`, value: fmt(ref.contractValue) },
      { field: `${L.refContact} ${i + 1}`, value: contact },
      { field: `${i + 1}`, value: fmt(ref.description) }
    );
  });
  if (refRows.length) addSection(L.sectionReferences, refRows);

  const docRows = [];
  (s.documents || []).filter((d) => d.isActive !== false).forEach((doc, i) => {
    docRows.push(
      { field: `${L.docFile} ${i + 1}`, value: fmt(doc.fileName) },
      { field: `${L.docType} ${i + 1}`, value: fmt(doc.documentType) },
      { field: `${L.docValidFrom} ${i + 1}`, value: fmtDate(doc.validFrom) },
      { field: `${L.docValidTo} ${i + 1}`, value: fmtDate(doc.validTo) },
      { field: `${L.docIssuer} ${i + 1}`, value: fmt(doc.issuer) },
      { field: `${L.docNumber} ${i + 1}`, value: fmt(doc.documentNumber) }
    );
  });
  if (docRows.length) addSection(L.sectionDocuments, docRows);

  return { sections, meta: { title: L.title, exportedAt: L.exportedAt, companyName: s.companyName } };
}

function sanitizeFilename(name) {
  return (name || 'supplier-profile')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'supplier-profile';
}

async function generateExcelBuffer(supplier, completeness, lang) {
  const { sections, meta } = buildExportSections(supplier, completeness, lang);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PrequaliQ';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Profile', {
    views: [{ state: 'frozen', ySplit: 3 }]
  });

  sheet.columns = [
    { header: 'Section', key: 'section', width: 28 },
    { header: 'Field', key: 'field', width: 36 },
    { header: 'Value', key: 'value', width: 64 }
  ];

  sheet.mergeCells('A1:C1');
  sheet.getCell('A1').value = meta.title;
  sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF0F2744' } };
  sheet.mergeCells('A2:C2');
  sheet.getCell('A2').value = `${meta.exportedAt}: ${new Date().toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB')}`;
  sheet.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF5C6B7A' } };

  const headerRow = sheet.getRow(3);
  headerRow.values = ['Section', 'Field', 'Value'];
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A5C' } };
  headerRow.alignment = { vertical: 'middle' };

  let rowIndex = 4;
  sections.forEach((section) => {
    section.rows.forEach((row) => {
      const excelRow = sheet.getRow(rowIndex++);
      excelRow.values = [section.title, row.field, row.value];
      excelRow.alignment = { wrapText: true, vertical: 'top' };
      if (rowIndex % 2 === 0) {
        excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F9' } };
      }
    });
  });

  return workbook.xlsx.writeBuffer();
}

function generatePdfBuffer(supplier, completeness, lang) {
  const { sections, meta } = buildExportSections(supplier, completeness, lang);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.fontSize(18).fillColor('#0F2744').text(meta.title, { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor('#5C6B7A').text(
      `${meta.exportedAt}: ${new Date().toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB')}`,
      { align: 'left' }
    );
    if (meta.companyName) {
      doc.text(meta.companyName, { align: 'left' });
    }
    doc.moveDown(1);

    sections.forEach((section) => {
      if (doc.y > doc.page.height - 120) doc.addPage();

      doc.fontSize(12).fillColor('#1A3A5C').text(section.title, { underline: true });
      doc.moveDown(0.4);

      section.rows.forEach((row) => {
        if (doc.y > doc.page.height - 80) doc.addPage();

        doc.fontSize(9).fillColor('#5C6B7A').text(row.field, { continued: false, width: pageWidth });
        doc.fontSize(10).fillColor('#0B1220').text(fmt(row.value), {
          width: pageWidth,
          align: 'left'
        });
        doc.moveDown(0.35);
      });

      doc.moveDown(0.6);
    });

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#94A3B8').text(
        `PrequaliQ · ${i - range.start + 1} / ${range.count}`,
        doc.page.margins.left,
        doc.page.height - 36,
        { align: 'center', width: pageWidth }
      );
    }

    doc.end();
  });
}

function getExportFilename(companyName, format) {
  const base = sanitizeFilename(companyName);
  const date = new Date().toISOString().split('T')[0];
  const ext = format === 'pdf' ? 'pdf' : 'xlsx';
  return `${base}-profile-${date}.${ext}`;
}

module.exports = {
  generateExcelBuffer,
  generatePdfBuffer,
  getExportFilename,
  buildExportSections
};
