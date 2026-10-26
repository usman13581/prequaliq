/** Only active contracts accept messages / delivery mutations. */
function contractIsWritable(contract) {
  return Boolean(contract && contract.status === 'active');
}

module.exports = { contractIsWritable };
