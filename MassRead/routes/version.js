const express = require('express');
const router = express.Router();
const { getVersions } = require('../controllers/versionController');

router.get('/', getVersions);

module.exports = router;