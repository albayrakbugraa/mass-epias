const express = require("express");
const router = express.Router();
const controller = require("../controllers/subscriptionController");

// POST /subscription/check
router.post("/", controller.saveSubscription);

// GET /subscription/{subscriptionKey}
router.put("/details", controller.saveSubscriptionDetails);

// DELETE /subscription/{subscriptionKey}
router.put("/deactivate/:subscriptionKey", controller.deactivateSubscription);

// GET /subscription/:subscriptionKey/readings
router.get("/:subscriptionKey/readings", controller.getReadings);

// GET /subscription/:subscriptionKey/compensation/yearly?start=...&end=...
router.get("/:subscriptionKey/compensation/yearly", controller.getYearlyCompensation);

// GET /subscription/:subscriptionKey/compensation/extended?start=...&end=...
router.get("/:subscriptionKey/compensation/extended", controller.getExtendedCompensation);

// GET /subscription/:subscriptionKey/outages?start=...&end=...
router.get("/:subscriptionKey/outages", controller.getOutages);

// GET /subscription/:subscriptionKey/reported-outages?start=...&end=...
router.get("/:subscriptionKey/reported-outages", controller.getReportedOutages);

// PUT /subscription/:subscriptionKey/usage-limit-threshold
router.put("/:subscriptionKey/usage-limit-threshold", controller.updateUsageLimitThreshold);

// PUT /subscription/:subscriptionKey/unexpected-usage-threshold
router.put("/:subscriptionKey/unexpected-usage-threshold", controller.updateUnexpectedUsageThreshold);


module.exports = router;
