const express = require("express");
const router = express.Router();
const fileController = require('../controllers/fileController');


router.get("/file/download/:fileId", fileController.downloadComplaintFile);
router.get('/file/exists/:fileId', fileController.fileExists);
router.put('/uploads/:fileName', fileController.uploadFile);



module.exports = router;
