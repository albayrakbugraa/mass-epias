const express = require('express');
const router = express.Router();
const controller = require('../controllers/subscriptionController');

//7.4 POST /subscription/check
router.post('/check', controller.checkSubscription);

//7.5 GET /subscription/{subscriptionKey}
router.get("/:subscriptionKey", controller.getSubscriptionDetails);

//7.8 PUT /subscription/{subscriptionKey}/usage-limit-threshold
router.put("/:subscriptionKey/usage-limit-threshold", controller.updateUsageLimitThreshold);

//7.9 PUT /subscription/{subscriptionKey}/unexpected-usage-threshold
router.put("/:subscriptionKey/unexpected-usage-threshold", controller.updateUnexpectedUsageThreshold);

//7.10 DELETE /subscription/{subscriptionKey}
router.delete("/:subscriptionKey", controller.deleteSubscription);

module.exports = router;