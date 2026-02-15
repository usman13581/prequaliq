const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, announcementController.getAnnouncements);
router.post('/', authenticate, authorize('admin', 'procuring_entity'), announcementController.createAnnouncement);
router.get('/all', authenticate, authorize('admin'), announcementController.getAllAnnouncements);
router.put('/:id', authenticate, authorize('admin'), announcementController.updateAnnouncement);
router.delete('/:id', authenticate, authorize('admin'), announcementController.deleteAnnouncement);

module.exports = router;
