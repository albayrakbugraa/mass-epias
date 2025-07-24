const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');

router.post('/', complaintController.saveComplaint);
router.put('/link-files', complaintController.linkFilesByDownloadUrl);
router.get('/:complaintId', complaintController.getComplaint);
router.get('/:complaintId/files', complaintController.getFileUrlsByComplaintId);
router.post('/file', complaintController.createComplaintFile);
router.patch('/file/:id', complaintController.confirmComplaintFileUpload);
router.delete('/:complaintId', complaintController.deleteComplaint);
router.get('/file/info/:fileId', complaintController.getUploadInfo);

module.exports = router;
