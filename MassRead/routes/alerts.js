const express = require('express');
const router = express.Router();
const { getAlerts } = require('../controllers/alertsController');

router.get('/:subscriptionKey/alerts', getAlerts);

module.exports = router;