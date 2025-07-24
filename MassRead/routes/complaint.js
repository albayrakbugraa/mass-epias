const express = require("express");
const router = express.Router();
const complaintController = require("../controllers/complaintController");

router.post("/", complaintController.createComplaint);              //7.12 POST /complaint
router.get("/:complaintId", complaintController.getComplaintDetails);        //7.13 GET /complaint/{complaintId}
router.post('/file', complaintController.createComplaintFile);      //7.14 POST /complaint/file
router.patch('/file/:id', complaintController.confirmComplaintFileUpload);    //7.15 PATCH /complaint/file/{id}
router.delete("/:complaintId", complaintController.deleteComplaint);         //7.16 DELETE /complaint/{complaintId}

module.exports = router;
