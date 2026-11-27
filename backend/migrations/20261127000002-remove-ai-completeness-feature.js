'use strict';

/** The AI completeness check was removed; drop its switch rows so it no longer shows in AI settings. */
const KEY = 'ai.completeness_conflict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkDelete('feature_entitlements', { featureKey: KEY });
    await queryInterface.bulkDelete('platform_feature_flags', { featureKey: KEY });
  },

  // The rows are created again on demand if the feature key ever returns; nothing to restore.
  async down() {}
};
