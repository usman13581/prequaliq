const savedSearchService = require('../services/savedSearchService');

const list = async (req, res) => {
  try {
    const searches = await savedSearchService.listForUser(req.user.id, req.query.scope);
    res.json({ searches });
  } catch (error) {
    console.error('List saved searches error:', error);
    const status = error.status || 500;
    res.status(status).json({
      message: status === 400 ? error.message : 'Error listing saved searches',
      ...(status === 500 ? { error: error.message } : {})
    });
  }
};

const create = async (req, res) => {
  try {
    const search = await savedSearchService.createForUser(req.user.id, {
      scope: req.body.scope,
      name: req.body.name,
      filters: req.body.filters
    });
    res.status(201).json({ message: 'Saved search created', search });
  } catch (error) {
    console.error('Create saved search error:', error);
    const status = error.status || 500;
    res.status(status).json({
      message: status === 400 ? error.message : 'Error creating saved search',
      ...(status === 500 ? { error: error.message } : {})
    });
  }
};

const update = async (req, res) => {
  try {
    const search = await savedSearchService.updateOwned(req.user.id, req.params.id, {
      name: req.body.name,
      filters: req.body.filters
    });
    if (!search) return res.status(404).json({ message: 'Saved search not found' });
    res.json({ message: 'Saved search updated', search });
  } catch (error) {
    console.error('Update saved search error:', error);
    const status = error.status || 500;
    res.status(status).json({
      message: status === 400 ? error.message : 'Error updating saved search',
      ...(status === 500 ? { error: error.message } : {})
    });
  }
};

const remove = async (req, res) => {
  try {
    const ok = await savedSearchService.deleteOwned(req.user.id, req.params.id);
    if (!ok) return res.status(404).json({ message: 'Saved search not found' });
    res.json({ message: 'Saved search deleted' });
  } catch (error) {
    console.error('Delete saved search error:', error);
    res.status(500).json({ message: 'Error deleting saved search', error: error.message });
  }
};

module.exports = { list, create, update, remove };
