const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/validate', authController.validateApiKey);

module.exports = router;
