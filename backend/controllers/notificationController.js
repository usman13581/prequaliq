const {
  listForUser,
  previewForUser,
  markRead,
  markAllRead
} = require('../services/notificationService');

const getPreview = async (req, res) => {
  try {
    const data = await previewForUser(req.user.id, 10);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

const list = async (req, res) => {
  try {
    const { search, page, pageSize, unreadOnly } = req.query;
    const data = await listForUser(req.user.id, {
      search: search || '',
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 10,
      unreadOnly: unreadOnly === 'true' || unreadOnly === '1'
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

const markOneRead = async (req, res) => {
  try {
    const notification = await markRead(req.user.id, req.params.notificationId);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification', error: error.message });
  }
};

const markAll = async (req, res) => {
  try {
    await markAllRead(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications', error: error.message });
  }
};

module.exports = {
  getPreview,
  list,
  markOneRead,
  markAll
};
