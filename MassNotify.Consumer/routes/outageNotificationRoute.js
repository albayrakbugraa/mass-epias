const express = require('express');
const router = express.Router();
const outageNotificationController = require('../controllers/outageNotificationController');

// POST /api/v1/notifications/outage-notification
router.post('/outage-notification', outageNotificationController.sendOutageNotification);

module.exports = router;
