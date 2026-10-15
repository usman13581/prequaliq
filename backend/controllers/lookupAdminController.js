const db = require('../models');
const { Op } = require('sequelize');

const RESERVED_TYPE_KEYS = new Set(['cpv', 'nuts']);
/** Full CPV catalog is ~9–10k rows; allow admin/list to page through all of them. */
const MAX_LOOKUP_LIMIT = 20000;

const SYSTEM_TYPES = [
  {
    key: 'cpv',
    labelEn: 'CPV codes',
    labelSv: 'CPV-koder',
    isSystem: true,
    kind: 'cpv'
  },
  {
    key: 'nuts',
    labelEn: 'NUTS regions',
    labelSv: 'NUTS-regioner',
    isSystem: true,
    kind: 'nuts'
  }
];

function normalizeTypeKey(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function resolveKind(typeKey) {
  if (typeKey === 'cpv') return 'cpv';
  if (typeKey === 'nuts') return 'nuts';
  return 'generic';
}

function buildSearchWhere(kind, search) {
  if (!search || !String(search).trim()) return {};
  const term = `%${String(search).trim()}%`;
  if (kind === 'cpv') {
    return {
      [Op.or]: [
        { code: { [Op.iLike]: term } },
        { description: { [Op.iLike]: term } }
      ]
    };
  }
  if (kind === 'nuts') {
    return {
      [Op.or]: [
        { code: { [Op.iLike]: term } },
        { name: { [Op.iLike]: term } },
        { nameSwedish: { [Op.iLike]: term } }
      ]
    };
  }
  return {
    [Op.or]: [
      { code: { [Op.iLike]: term } },
      { labelEn: { [Op.iLike]: term } },
      { labelSv: { [Op.iLike]: term } }
    ]
  };
}

async function fetchItemsForType(typeKey, options = {}) {
  const { search, includeInactive = false, limit, offset } = options;
  const kind = resolveKind(typeKey);
  const where = {
    ...buildSearchWhere(kind, search)
  };
  if (!includeInactive) {
    where.isActive = true;
  }

  const query = { where, order: [] };

  if (kind === 'cpv') {
    query.order = [['code', 'ASC']];
    if (limit != null) query.limit = limit;
    if (offset != null) query.offset = offset;
    const { rows, count } = await db.CPVCode.findAndCountAll(query);
    return { kind, items: rows, total: count };
  }
  if (kind === 'nuts') {
    query.order = [['code', 'ASC']];
    if (limit != null) query.limit = limit;
    if (offset != null) query.offset = offset;
    const { rows, count } = await db.NUTSCode.findAndCountAll(query);
    return { kind, items: rows, total: count };
  }

  where.typeKey = typeKey;
  query.order = [
    ['sortOrder', 'ASC'],
    ['code', 'ASC']
  ];
  if (limit != null) query.limit = limit;
  if (offset != null) query.offset = offset;
  const { rows, count } = await db.AppLookup.findAndCountAll(query);
  return { kind, items: rows, total: count };
}

/** Public: active items only for dropdowns */
const listPublicByType = async (req, res) => {
  try {
    const typeKey = normalizeTypeKey(req.params.type);
    if (!typeKey) {
      return res.status(400).json({ message: 'Lookup type is required' });
    }

    if (resolveKind(typeKey) === 'generic') {
      const typeRow = await db.LookupType.findOne({ where: { key: typeKey } });
      if (!typeRow) {
        return res.status(404).json({ message: 'Lookup type not found' });
      }
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 500, MAX_LOOKUP_LIMIT);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const { items, kind, total } = await fetchItemsForType(typeKey, {
      search: req.query.search,
      includeInactive: false,
      limit,
      offset
    });

    res.json({ type: typeKey, kind, items, total });
  } catch (error) {
    console.error('Public list lookups error:', error);
    res.status(500).json({ message: 'Error fetching lookups' });
  }
};

const listTypes = async (_req, res) => {
  try {
    const custom = db.LookupType
      ? await db.LookupType.findAll({ order: [['key', 'ASC']] })
      : [];
    const customMapped = custom.map((t) => ({
      key: t.key,
      labelEn: t.labelEn,
      labelSv: t.labelSv,
      isSystem: !!t.isSystem,
      kind: 'generic'
    }));
    res.json({ types: [...SYSTEM_TYPES, ...customMapped] });
  } catch (error) {
    console.error('List lookup types error:', error);
    res.status(500).json({ message: 'Error listing lookup types' });
  }
};

const createType = async (req, res) => {
  try {
    if (!db.LookupType) {
      return res.status(503).json({ message: 'Lookup types are not available. Run migrations first.' });
    }
    const key = normalizeTypeKey(req.body.key);
    const labelEn = String(req.body.labelEn || '').trim();
    const labelSv = String(req.body.labelSv || '').trim();

    if (!key || key.length < 2) {
      return res.status(400).json({ message: 'Type key must be at least 2 characters' });
    }
    if (RESERVED_TYPE_KEYS.has(key)) {
      return res.status(400).json({ message: 'This type key is reserved' });
    }
    if (!labelEn || !labelSv) {
      return res.status(400).json({ message: 'English and Swedish labels are required' });
    }

    const existing = await db.LookupType.findOne({ where: { key } });
    if (existing) {
      return res.status(409).json({ message: 'A lookup type with this key already exists' });
    }

    const lookupType = await db.LookupType.create({
      key,
      labelEn,
      labelSv,
      isSystem: false
    });
    res.status(201).json({ message: 'Lookup type created', lookupType });
  } catch (error) {
    console.error('Create lookup type error:', error);
    res.status(500).json({ message: 'Error creating lookup type' });
  }
};

const listItems = async (req, res) => {
  try {
    const typeKey = normalizeTypeKey(req.params.type);
    if (!typeKey) {
      return res.status(400).json({ message: 'Lookup type is required' });
    }

    const kind = resolveKind(typeKey);
    if (kind === 'generic') {
      const typeRow = await db.LookupType.findOne({ where: { key: typeKey } });
      if (!typeRow) {
        return res.status(404).json({ message: 'Lookup type not found' });
      }
    }

    const includeInactive = req.query.includeInactive !== 'false';
    const limitParam = req.query.limit;
    const offsetParam = req.query.offset;
    // Default page size keeps huge catalogs (CPV) usable; pass a higher limit only when needed.
    const limit =
      limitParam != null
        ? Math.min(parseInt(limitParam, 10) || 100, MAX_LOOKUP_LIMIT)
        : 100;
    const offset = offsetParam != null ? Math.max(parseInt(offsetParam, 10) || 0, 0) : 0;

    const result = await fetchItemsForType(typeKey, {
      search: req.query.search,
      includeInactive,
      limit,
      offset
    });

    res.json({
      type: typeKey,
      kind: result.kind,
      items: result.items,
      total: result.total,
      limit,
      offset
    });
  } catch (error) {
    console.error('List lookup items error:', error);
    res.status(500).json({ message: 'Error listing lookup items' });
  }
};

async function findItemByKind(kind, typeKey, id) {
  if (kind === 'cpv') {
    return db.CPVCode.findByPk(id);
  }
  if (kind === 'nuts') {
    return db.NUTSCode.findByPk(id);
  }
  const row = await db.AppLookup.findByPk(id);
  if (row && row.typeKey !== typeKey) return null;
  return row;
}

const createItem = async (req, res) => {
  try {
    const typeKey = normalizeTypeKey(req.params.type);
    const kind = resolveKind(typeKey);

    if (kind === 'generic') {
      const typeRow = await db.LookupType.findOne({ where: { key: typeKey } });
      if (!typeRow) {
        return res.status(404).json({ message: 'Lookup type not found' });
      }
    }

    const code = String(req.body.code || '').trim();
    if (!code) {
      return res.status(400).json({ message: 'Code is required' });
    }

    if (kind === 'cpv') {
      const dup = await db.CPVCode.findOne({ where: { code } });
      if (dup) return res.status(409).json({ message: 'A CPV code with this code already exists' });
      const description = String(req.body.description || '').trim();
      if (!description) {
        return res.status(400).json({ message: 'Description is required' });
      }
      const item = await db.CPVCode.create({
        code,
        description,
        parentCode: req.body.parentCode?.trim() || null,
        level: req.body.level != null ? parseInt(req.body.level, 10) : 1,
        isActive: req.body.isActive !== false
      });
      return res.status(201).json({ message: 'Lookup item created', item });
    }

    if (kind === 'nuts') {
      const dup = await db.NUTSCode.findOne({ where: { code } });
      if (dup) return res.status(409).json({ message: 'A NUTS code with this code already exists' });
      const name = String(req.body.name || '').trim();
      const nameSwedish = String(req.body.nameSwedish || '').trim();
      if (!name || !nameSwedish) {
        return res.status(400).json({ message: 'Name (EN) and Swedish name are required' });
      }
      const item = await db.NUTSCode.create({
        code,
        name,
        nameSwedish,
        level: parseInt(req.body.level, 10) || 1,
        parentCode: req.body.parentCode?.trim() || null,
        isActive: req.body.isActive !== false
      });
      return res.status(201).json({ message: 'Lookup item created', item });
    }

    const dup = await db.AppLookup.findOne({ where: { typeKey, code } });
    if (dup) return res.status(409).json({ message: 'An item with this code already exists for this type' });
    const labelEn = String(req.body.labelEn || '').trim();
    const labelSv = String(req.body.labelSv || '').trim();
    if (!labelEn || !labelSv) {
      return res.status(400).json({ message: 'English and Swedish labels are required' });
    }
    const item = await db.AppLookup.create({
      typeKey,
      code,
      labelEn,
      labelSv,
      sortOrder: parseInt(req.body.sortOrder, 10) || 0,
      parentCode: req.body.parentCode?.trim() || null,
      level: req.body.level != null ? parseInt(req.body.level, 10) : null,
      isActive: req.body.isActive !== false
    });
    return res.status(201).json({ message: 'Lookup item created', item });
  } catch (error) {
    console.error('Create lookup item error:', error);
    res.status(500).json({ message: 'Error creating lookup item' });
  }
};

const updateItem = async (req, res) => {
  try {
    const typeKey = normalizeTypeKey(req.params.type);
    const { id } = req.params;
    const kind = resolveKind(typeKey);

    const item = await findItemByKind(kind, typeKey, id);
    if (!item) {
      return res.status(404).json({ message: 'Lookup item not found' });
    }

    if (kind === 'cpv') {
      const updates = {};
      if (req.body.code !== undefined) {
        const code = String(req.body.code).trim();
        if (!code) return res.status(400).json({ message: 'Code cannot be empty' });
        if (code !== item.code) {
          const dup = await db.CPVCode.findOne({ where: { code } });
          if (dup) return res.status(409).json({ message: 'A CPV code with this code already exists' });
        }
        updates.code = code;
      }
      if (req.body.description !== undefined) {
        const description = String(req.body.description).trim();
        if (!description) return res.status(400).json({ message: 'Description is required' });
        updates.description = description;
      }
      if (req.body.parentCode !== undefined) updates.parentCode = req.body.parentCode?.trim() || null;
      if (req.body.level !== undefined) updates.level = parseInt(req.body.level, 10);
      if (req.body.isActive !== undefined) updates.isActive = !!req.body.isActive;
      await item.update(updates);
      return res.json({ message: 'Lookup item updated', item });
    }

    if (kind === 'nuts') {
      const updates = {};
      if (req.body.code !== undefined) {
        const code = String(req.body.code).trim();
        if (!code) return res.status(400).json({ message: 'Code cannot be empty' });
        if (code !== item.code) {
          const dup = await db.NUTSCode.findOne({ where: { code } });
          if (dup) return res.status(409).json({ message: 'A NUTS code with this code already exists' });
        }
        updates.code = code;
      }
      if (req.body.name !== undefined) {
        const name = String(req.body.name).trim();
        if (!name) return res.status(400).json({ message: 'Name is required' });
        updates.name = name;
      }
      if (req.body.nameSwedish !== undefined) {
        const nameSwedish = String(req.body.nameSwedish).trim();
        if (!nameSwedish) return res.status(400).json({ message: 'Swedish name is required' });
        updates.nameSwedish = nameSwedish;
      }
      if (req.body.parentCode !== undefined) updates.parentCode = req.body.parentCode?.trim() || null;
      if (req.body.level !== undefined) updates.level = parseInt(req.body.level, 10);
      if (req.body.isActive !== undefined) updates.isActive = !!req.body.isActive;
      await item.update(updates);
      return res.json({ message: 'Lookup item updated', item });
    }

    const updates = {};
    if (req.body.code !== undefined) {
      const code = String(req.body.code).trim();
      if (!code) return res.status(400).json({ message: 'Code cannot be empty' });
      if (code !== item.code) {
        const dup = await db.AppLookup.findOne({ where: { typeKey, code } });
        if (dup) return res.status(409).json({ message: 'An item with this code already exists for this type' });
      }
      updates.code = code;
    }
    if (req.body.labelEn !== undefined) {
      const labelEn = String(req.body.labelEn).trim();
      if (!labelEn) return res.status(400).json({ message: 'English label is required' });
      updates.labelEn = labelEn;
    }
    if (req.body.labelSv !== undefined) {
      const labelSv = String(req.body.labelSv).trim();
      if (!labelSv) return res.status(400).json({ message: 'Swedish label is required' });
      updates.labelSv = labelSv;
    }
    if (req.body.sortOrder !== undefined) updates.sortOrder = parseInt(req.body.sortOrder, 10) || 0;
    if (req.body.parentCode !== undefined) updates.parentCode = req.body.parentCode?.trim() || null;
    if (req.body.level !== undefined) {
      updates.level = req.body.level === null || req.body.level === '' ? null : parseInt(req.body.level, 10);
    }
    if (req.body.isActive !== undefined) updates.isActive = !!req.body.isActive;
    await item.update(updates);
    return res.json({ message: 'Lookup item updated', item });
  } catch (error) {
    console.error('Update lookup item error:', error);
    res.status(500).json({ message: 'Error updating lookup item' });
  }
};

const toggleActive = async (req, res) => {
  try {
    const typeKey = normalizeTypeKey(req.params.type);
    const { id } = req.params;
    const kind = resolveKind(typeKey);

    const item = await findItemByKind(kind, typeKey, id);
    if (!item) {
      return res.status(404).json({ message: 'Lookup item not found' });
    }

    const next = req.body.isActive !== undefined ? !!req.body.isActive : !item.isActive;
    await item.update({ isActive: next });
    res.json({
      message: next ? 'Lookup item activated' : 'Lookup item deactivated',
      item
    });
  } catch (error) {
    console.error('Toggle lookup item error:', error);
    res.status(500).json({ message: 'Error updating lookup item status' });
  }
};

module.exports = {
  listPublicByType,
  listTypes,
  createType,
  listItems,
  createItem,
  updateItem,
  toggleActive
};
