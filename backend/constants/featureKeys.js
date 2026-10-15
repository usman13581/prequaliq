/**
 * Canonical English feature keys for entitlements (plans 04 / 41).
 * liveDefaults: enabled for approved accounts on migration / approve.
 * plannedDefaults: off until admin unlocks.
 */
const FEATURE_CATALOG = [
  // Platform
  { key: 'platform.self_registration', layer: 'platform', liveDefault: true },
  { key: 'platform.admin_approval', layer: 'platform', liveDefault: true },
  { key: 'platform.feature_entitlements', layer: 'platform', liveDefault: true },
  { key: 'platform.multi_org', layer: 'platform', liveDefault: true },
  { key: 'platform.feature_flags_tech', layer: 'platform', liveDefault: true },
  { key: 'platform.analytics', layer: 'parity', liveDefault: true },
  { key: 'platform.integrations', layer: 'parity', liveDefault: true },
  { key: 'platform.notifications_audit', layer: 'parity', liveDefault: true },

  // Profiles
  { key: 'profile.entity', layer: 'parity', liveDefault: true },
  { key: 'profile.supplier', layer: 'parity', liveDefault: true },
  { key: 'catalog.cpv_nuts', layer: 'parity', liveDefault: true },
  { key: 'profile.documents', layer: 'parity', liveDefault: true },

  // Lifecycle
  { key: 'tender.procedure_setup', layer: 'parity', liveDefault: true },
  { key: 'tender.requirements', layer: 'parity', liveDefault: true },
  { key: 'tender.publish', layer: 'parity', liveDefault: true },
  { key: 'tender.search_watch', layer: 'parity', liveDefault: true },
  { key: 'tender.qa', layer: 'parity', liveDefault: true },
  { key: 'tender.espd_exclusion', layer: 'parity', liveDefault: true },
  { key: 'tender.bid_submit', layer: 'parity', liveDefault: true },
  { key: 'tender.sealed_deadline', layer: 'parity', liveDefault: true },
  { key: 'tender.complements', layer: 'parity', liveDefault: true },
  { key: 'evaluation.scoring', layer: 'parity', liveDefault: true },
  { key: 'tender.award', layer: 'parity', liveDefault: true },
  { key: 'tender.after_announce_close', layer: 'parity', liveDefault: true },
  { key: 'tender.direct_procurement', layer: 'parity', liveDefault: true },
  { key: 'contracts.call_offs', layer: 'parity', liveDefault: true },
  { key: 'tender.dis', layer: 'parity', liveDefault: true },
  { key: 'contracts.repository', layer: 'parity', liveDefault: true },
  { key: 'marketplace.supplier_discovery', layer: 'parity', liveDefault: true },

  // AI
  { key: 'ai.profile_assist', layer: 'ai-extra', liveDefault: true },
  { key: 'ai.requirements_builder', layer: 'ai-extra', liveDefault: true },
  { key: 'ai.bid_suggestions', layer: 'ai-extra', liveDefault: true },
  { key: 'ai.completeness_conflict', layer: 'ai-extra', liveDefault: true },
  { key: 'ai.qualification_risk', layer: 'ai-extra', liveDefault: true },
  { key: 'ai.evaluation_copilot', layer: 'ai-extra', liveDefault: true },
  { key: 'ai.qa_draft_replies', layer: 'ai-extra', liveDefault: true },
  { key: 'ai.announcement_draft', layer: 'ai-extra', liveDefault: true },
  { key: 'ai.award_memo', layer: 'ai-extra', liveDefault: true },
  { key: 'ai.cpv_recommender', layer: 'ai-extra', liveDefault: true },
  { key: 'ai.supplier_matching', layer: 'ai-extra', liveDefault: true }
];

const ALL_KEYS = FEATURE_CATALOG.map((f) => f.key);
const AI_KEYS = FEATURE_CATALOG.filter((f) => f.layer === 'ai-extra').map((f) => f.key);
const AI_MASTER_KEY = 'ai.__master__';

/** Human-facing catalog for AI preference UIs */
const AI_FEATURE_LABELS = {
  'ai.profile_assist': {
    nameKey: 'aiFeatures.profileAssist.name',
    descKey: 'aiFeatures.profileAssist.desc'
  },
  'ai.requirements_builder': {
    nameKey: 'aiFeatures.requirementsBuilder.name',
    descKey: 'aiFeatures.requirementsBuilder.desc'
  },
  'ai.bid_suggestions': {
    nameKey: 'aiFeatures.bidSuggestions.name',
    descKey: 'aiFeatures.bidSuggestions.desc'
  },
  'ai.completeness_conflict': {
    nameKey: 'aiFeatures.completeness.name',
    descKey: 'aiFeatures.completeness.desc'
  },
  'ai.qualification_risk': {
    nameKey: 'aiFeatures.qualificationRisk.name',
    descKey: 'aiFeatures.qualificationRisk.desc'
  },
  'ai.evaluation_copilot': {
    nameKey: 'aiFeatures.evaluationCopilot.name',
    descKey: 'aiFeatures.evaluationCopilot.desc'
  },
  'ai.qa_draft_replies': {
    nameKey: 'aiFeatures.qaDraft.name',
    descKey: 'aiFeatures.qaDraft.desc'
  },
  'ai.announcement_draft': {
    nameKey: 'aiFeatures.announcementDraft.name',
    descKey: 'aiFeatures.announcementDraft.desc'
  },
  'ai.award_memo': {
    nameKey: 'aiFeatures.awardMemo.name',
    descKey: 'aiFeatures.awardMemo.desc'
  },
  'ai.cpv_recommender': {
    nameKey: 'aiFeatures.cpvRecommender.name',
    descKey: 'aiFeatures.cpvRecommender.desc'
  },
  'ai.supplier_matching': {
    nameKey: 'aiFeatures.supplierMatching.name',
    descKey: 'aiFeatures.supplierMatching.desc'
  }
};

function defaultEnabledMap() {
  const map = {};
  for (const f of FEATURE_CATALOG) {
    map[f.key] = !!f.liveDefault;
  }
  return map;
}

module.exports = {
  FEATURE_CATALOG,
  ALL_KEYS,
  AI_KEYS,
  AI_MASTER_KEY,
  AI_FEATURE_LABELS,
  defaultEnabledMap
};
