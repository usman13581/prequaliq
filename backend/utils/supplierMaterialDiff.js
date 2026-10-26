/** Treat null and empty string as equivalent for material profile diffs. */
function valuesDiffer(a, b) {
  if (a == null && (b === '' || b == null)) return false;
  if (b == null && (a === '' || a == null)) return false;
  return String(a ?? '') !== String(b ?? '');
}

function supplierMaterialFieldsChanged(supplier, updateData) {
  return Object.entries(updateData).some(([key, val]) =>
    valuesDiffer(typeof supplier?.getDataValue === 'function' ? supplier.getDataValue(key) : supplier?.[key], val)
  );
}

module.exports = {
  valuesDiffer,
  supplierMaterialFieldsChanged,
};
