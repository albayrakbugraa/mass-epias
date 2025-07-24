const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.put('/webhook', notificationController.setWebhook);

module.exports = router;
