const db = require('../models');
const {
  FEATURE_CATALOG,
  defaultEnabledMap,
  ALL_KEYS,
  AI_KEYS,
  AI_MASTER_KEY,
  AI_FEATURE_LABELS
} = require('../constants/featureKeys');

async function ensureDefaultsForUser(userId) {
  if (!db.FeatureEntitlement || !userId) return;
  const defaults = defaultEnabledMap();
  const existing = await db.FeatureEntitlement.findAll({
    where: { userId },
    attributes: ['featureKey']
  });
  const have = new Set(existing.map((e) => e.featureKey));
  const toCreate = ALL_KEYS.filter((k) => !have.has(k)).map((featureKey) => ({
    userId,
    featureKey,
    enabled: !!defaults[featureKey]
  }));
  if (toCreate.length) {
    await db.FeatureEntitlement.bulkCreate(toCreate, { ignoreDuplicates: true });
  }
}

async function getEntitlementsForUser(userId) {
  const map = defaultEnabledMap();
  if (!db.FeatureEntitlement || !userId) return map;
  try {
    await ensureDefaultsForUser(userId);
    const rows = await db.FeatureEntitlement.findAll({ where: { userId } });
    for (const row of rows) {
      map[row.featureKey] = !!row.enabled;
    }
  } catch (err) {
    console.warn('getEntitlementsForUser fallback to defaults:', err.message);
  }
  return map;
}

async function setEntitlementsForUser(userId, updates) {
  const keys = Object.keys(updates || {}).filter((k) => ALL_KEYS.includes(k));
  for (const featureKey of keys) {
    const enabled = !!updates[featureKey];
    const [row] = await db.FeatureEntitlement.findOrCreate({
      where: { userId, featureKey },
      defaults: { enabled }
    });
    if (row.enabled !== enabled) {
      await row.update({ enabled });
    }
  }
  return getEntitlementsForUser(userId);
}

async function ensureGlobalAiDefaults() {
  if (!db.PlatformFeatureFlag) return;
  const keys = [AI_MASTER_KEY, ...AI_KEYS];
  for (const featureKey of keys) {
    await db.PlatformFeatureFlag.findOrCreate({
      where: { featureKey },
      defaults: { enabled: true }
    });
  }
}

async function getGlobalAiFlags() {
  const map = { [AI_MASTER_KEY]: true };
  for (const k of AI_KEYS) map[k] = true;
  if (!db.PlatformFeatureFlag) return map;
  try {
    await ensureGlobalAiDefaults();
    const rows = await db.PlatformFeatureFlag.findAll({
      where: { featureKey: [AI_MASTER_KEY, ...AI_KEYS] }
    });
    for (const row of rows) {
      map[row.featureKey] = !!row.enabled;
    }
  } catch (err) {
    console.warn('getGlobalAiFlags fallback:', err.message);
  }
  return map;
}

async function setGlobalAiFlags(updates) {
  if (!db.PlatformFeatureFlag) return getGlobalAiFlags();
  await ensureGlobalAiDefaults();
  const allowed = new Set([AI_MASTER_KEY, ...AI_KEYS]);
  for (const [featureKey, enabled] of Object.entries(updates || {})) {
    if (!allowed.has(featureKey)) continue;
    const [row] = await db.PlatformFeatureFlag.findOrCreate({
      where: { featureKey },
      defaults: { enabled: !!enabled }
    });
    if (row.enabled !== !!enabled) {
      await row.update({ enabled: !!enabled });
    }
  }
  return getGlobalAiFlags();
}

async function getUserAiPreferences(userId) {
  const preferences = {};
  for (const k of AI_KEYS) preferences[k] = true;
  let masterEnabled = true;
  if (!db.UserAiPreference || !userId) {
    return { masterEnabled, preferences };
  }
  try {
    const [row] = await db.UserAiPreference.findOrCreate({
      where: { userId },
      defaults: { masterEnabled: true, preferences: {} }
    });
    masterEnabled = row.masterEnabled !== false;
    const stored = row.preferences && typeof row.preferences === 'object' ? row.preferences : {};
    for (const k of AI_KEYS) {
      preferences[k] = stored[k] === undefined ? true : !!stored[k];
    }
  } catch (err) {
    console.warn('getUserAiPreferences fallback:', err.message);
  }
  return { masterEnabled, preferences };
}

async function setUserAiPreferences(userId, payload) {
  if (!db.UserAiPreference || !userId) {
    return getUserAiPreferences(userId);
  }
  const masterEnabled = payload.masterEnabled !== false;
  const nextPrefs = {};
  for (const k of AI_KEYS) {
    if (payload.preferences && Object.prototype.hasOwnProperty.call(payload.preferences, k)) {
      nextPrefs[k] = !!payload.preferences[k];
    } else {
      nextPrefs[k] = true;
    }
  }
  const [row] = await db.UserAiPreference.findOrCreate({
    where: { userId },
    defaults: { masterEnabled, preferences: nextPrefs }
  });
  await row.update({ masterEnabled, preferences: nextPrefs });
  return getUserAiPreferences(userId);
}

/**
 * Effective map for UI + API: non-AI keys from admin entitlements;
 * AI keys = global master ∧ global feature ∧ admin entitlement ∧ user master ∧ user pref.
 */
async function getEffectiveEntitlementsForUser(userId) {
  const entitlements = await getEntitlementsForUser(userId);
  const global = await getGlobalAiFlags();
  const prefs = await getUserAiPreferences(userId);
  const effective = { ...entitlements };

  const globalMaster = global[AI_MASTER_KEY] !== false;
  const userMaster = prefs.masterEnabled !== false;

  for (const key of AI_KEYS) {
    const g = globalMaster && global[key] !== false;
    const a = entitlements[key] !== false;
    const u = userMaster && prefs.preferences[key] !== false;
    effective[key] = Boolean(g && a && u);
  }
  return effective;
}

function catalogForApi() {
  return FEATURE_CATALOG.map(({ key, layer, liveDefault }) => ({
    key,
    layer,
    liveDefault: !!liveDefault
  }));
}

function aiCatalogForApi() {
  return AI_KEYS.map((key) => ({
    key,
    ...(AI_FEATURE_LABELS[key] || {})
  }));
}

module.exports = {
  ensureDefaultsForUser,
  getEntitlementsForUser,
  setEntitlementsForUser,
  getEffectiveEntitlementsForUser,
  getGlobalAiFlags,
  setGlobalAiFlags,
  getUserAiPreferences,
  setUserAiPreferences,
  catalogForApi,
  aiCatalogForApi,
  AI_KEYS,
  AI_MASTER_KEY
};
