const express = require('express');
const router = express.Router();
const { getReadings } = require('../controllers/readingsController');

router.get('/:subscriptionKey/readings', getReadings);

module.exports = router;