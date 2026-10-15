const entitlementService = require('../services/entitlementService');
const {
  getEntitlementsForUser,
  setEntitlementsForUser,
  getEffectiveEntitlementsForUser,
  getGlobalAiFlags,
  setGlobalAiFlags,
  getUserAiPreferences,
  setUserAiPreferences,
  catalogForApi,
  aiCatalogForApi,
  ensureDefaultsForUser,
  AI_KEYS,
  AI_MASTER_KEY
} = entitlementService;
const db = require('../models');

const getCatalog = async (_req, res) => {
  try {
    res.json({ catalog: catalogForApi(), aiCatalog: aiCatalogForApi() });
  } catch (error) {
    console.error('Get feature catalog error:', error);
    res.status(500).json({ message: 'Error fetching feature catalog', error: error.message });
  }
};

const getMyEntitlements = async (req, res) => {
  try {
    const entitlements = await getEffectiveEntitlementsForUser(req.user.id);
    const prefs = await getUserAiPreferences(req.user.id);
    res.json({
      entitlements,
      catalog: catalogForApi(),
      aiCatalog: aiCatalogForApi(),
      aiPreferences: prefs
    });
  } catch (error) {
    console.error('Get my entitlements error:', error);
    res.status(500).json({ message: 'Error fetching entitlements', error: error.message });
  }
};

const getMyAiPreferences = async (req, res) => {
  try {
    const prefs = await getUserAiPreferences(req.user.id);
    const entitlements = await getEntitlementsForUser(req.user.id);
    const global = await getGlobalAiFlags();
    res.json({
      ...prefs,
      aiCatalog: aiCatalogForApi(),
      adminEntitlements: Object.fromEntries(AI_KEYS.map((k) => [k, entitlements[k] !== false])),
      globalFlags: global
    });
  } catch (error) {
    console.error('Get AI preferences error:', error);
    res.status(500).json({ message: 'Error fetching AI preferences', error: error.message });
  }
};

const updateMyAiPreferences = async (req, res) => {
  try {
    const { masterEnabled, preferences } = req.body || {};
    const updated = await setUserAiPreferences(req.user.id, {
      masterEnabled,
      preferences: preferences || {}
    });
    const entitlements = await getEffectiveEntitlementsForUser(req.user.id);
    res.json({
      message: 'AI preferences saved',
      ...updated,
      entitlements,
      aiCatalog: aiCatalogForApi()
    });
  } catch (error) {
    console.error('Update AI preferences error:', error);
    res.status(500).json({ message: 'Error saving AI preferences', error: error.message });
  }
};

const getUserEntitlements = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await db.User.findByPk(userId, {
      attributes: ['id', 'email', 'role', 'firstName', 'lastName']
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const entitlements = await getEntitlementsForUser(userId);
    const effective = await getEffectiveEntitlementsForUser(userId);
    const aiPreferences = await getUserAiPreferences(userId);
    res.json({
      user,
      entitlements,
      effective,
      aiPreferences,
      catalog: catalogForApi(),
      aiCatalog: aiCatalogForApi()
    });
  } catch (error) {
    console.error('Get user entitlements error:', error);
    res.status(500).json({ message: 'Error fetching user entitlements', error: error.message });
  }
};

const updateUserEntitlements = async (req, res) => {
  try {
    const { userId } = req.params;
    const { entitlements, aiMasterEnabled } = req.body;
    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!entitlements || typeof entitlements !== 'object') {
      return res.status(400).json({ message: 'entitlements object is required' });
    }
    await ensureDefaultsForUser(userId);

    let next = { ...entitlements };
    if (typeof aiMasterEnabled === 'boolean') {
      for (const k of AI_KEYS) {
        next[k] = aiMasterEnabled;
      }
    }

    const updated = await setEntitlementsForUser(userId, next);
    res.json({
      message: 'Entitlements updated',
      entitlements: updated,
      catalog: catalogForApi(),
      aiCatalog: aiCatalogForApi()
    });
  } catch (error) {
    console.error('Update user entitlements error:', error);
    res.status(500).json({ message: 'Error updating entitlements', error: error.message });
  }
};

const getGlobalAiFlagsAdmin = async (_req, res) => {
  try {
    const flags = await entitlementService.getGlobalAiFlags();
    res.json({ flags, masterKey: AI_MASTER_KEY, aiCatalog: aiCatalogForApi() });
  } catch (error) {
    console.error('Get global AI flags error:', error);
    res.status(500).json({ message: 'Error fetching global AI flags', error: error.message });
  }
};

const updateGlobalAiFlags = async (req, res) => {
  try {
    const { flags } = req.body || {};
    if (!flags || typeof flags !== 'object') {
      return res.status(400).json({ message: 'flags object is required' });
    }
    const updated = await setGlobalAiFlags(flags);
    res.json({
      message: 'Global AI flags updated',
      flags: updated,
      masterKey: AI_MASTER_KEY,
      aiCatalog: aiCatalogForApi()
    });
  } catch (error) {
    console.error('Update global AI flags error:', error);
    res.status(500).json({ message: 'Error updating global AI flags', error: error.message });
  }
};

module.exports = {
  getCatalog,
  getMyEntitlements,
  getMyAiPreferences,
  updateMyAiPreferences,
  getUserEntitlements,
  updateUserEntitlements,
  getGlobalAiFlagsAdmin,
  updateGlobalAiFlags
};
