/** Treat null and empty string as equivalent for material profile diffs. */
function valuesDiffer(a, b) {
  if (a == null && (b === '' || b == null)) return false;
  if (b == null && (a === '' || a == null)) return false;
  return String(a ?? '') !== String(b ?? '');
}

/**
 * Contact and address details. Changing them never sends an approved profile back for
 * approval. Everything else on the supplier profile (registration number, tax id,
 * qualification answers, insurance) does, together with CPV codes, NUTS codes,
 * qualification documents and the sign-in email.
 */
const SUPPLIER_CONTACT_FIELDS = new Set(['companyName', 'address', 'city', 'country', 'phone', 'website']);

function readValue(row, key) {
  return typeof row?.getDataValue === 'function' ? row.getDataValue(key) : row?.[key];
}

function supplierMaterialFieldsChanged(supplier, updateData) {
  return Object.entries(updateData).some(
    ([key, val]) => !SUPPLIER_CONTACT_FIELDS.has(key) && valuesDiffer(readValue(supplier, key), val)
  );
}

/** True when two lists of ids hold different sets (order and duplicates ignored). */
function idSetsDiffer(before = [], after = []) {
  const a = new Set(before.map(String));
  const b = new Set(after.map(String));
  if (a.size !== b.size) return true;
  for (const id of a) if (!b.has(id)) return true;
  return false;
}

module.exports = {
  valuesDiffer,
  supplierMaterialFieldsChanged,
  idSetsDiffer,
  SUPPLIER_CONTACT_FIELDS,
};
