const axiosHelper = require("../utils/axiosHelper");

async function saveSubscriptionToDb(data, tracing) {
  return axiosHelper.post(
    `${process.env.MASS_DB_SRVC_URL}/subscription`,
    data,
    {},
    tracing.correlationId,
    tracing.requestId,
    tracing.spanIds
  );
}

async function updateSubscriptionDetails(data, tracing) {
  return axiosHelper.put(
    `${process.env.MASS_DB_SRVC_URL}/subscription/details`,
    data,
    {},
    tracing.correlationId,
    tracing.requestId,
    tracing.spanIds
  );
}

async function deactivateSubscription(subscriptionKey, tracing) {
  return axiosHelper.put(
    `${process.env.MASS_DB_SRVC_URL}/subscription/deactivate/${subscriptionKey}`,
    {},
    {},
    tracing.correlationId,
    tracing.requestId,
    tracing.spanIds
  );
}

async function getReadings(subscriptionKey, tracing) {
  const url = `${process.env.MASS_DB_SRVC_URL}/subscription/${subscriptionKey}/readings`;
  const response = await axiosHelper.get(
    url,
    {},
    tracing.correlationId,
    tracing.requestId,
    tracing.spanIds
  );
  return response.data;
}

async function getYearlyCompensation(subscriptionKey, start, end, tracing) {
  const url =
    `${process.env.MASS_DB_SRVC_URL}/subscription/${subscriptionKey}/compensation/yearly` +
    `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  const response = await axiosHelper.get(
    url,
    {},
    tracing.correlationId,
    tracing.requestId,
    tracing.spanIds
  );
  return response.data;
}

async function getExtendedCompensation(subscriptionKey, start, end, tracing) {
  const url =
    `${process.env.MASS_DB_SRVC_URL}/subscription/${subscriptionKey}/compensation/extended` +
    `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  const response = await axiosHelper.get(
    url,
    {},
    tracing.correlationId,
    tracing.requestId,
    tracing.spanIds
  );
  return response.data;
}

async function getOutages(subscriptionKey, start, end, tracing) {
  const url =
    `${process.env.MASS_DB_SRVC_URL}/subscription/${subscriptionKey}/outages` +
    `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  const response = await axiosHelper.get(
    url,
    {},
    tracing.correlationId,
    tracing.requestId,
    tracing.spanIds
  );
  return response.data;
}

async function getReportedOutages(subscriptionKey, start, end, tracing) {
  const url =
    `${process.env.MASS_DB_SRVC_URL}/subscription/${subscriptionKey}/reported-outages` +
    `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  const response = await axiosHelper.get(
    url,
    {},
    tracing.correlationId,
    tracing.requestId,
    tracing.spanIds
  );
  return response.data;
}

async function updateUsageLimitInDb(subscriptionKey, threshold, tracing) {
  return axiosHelper.put(
    `${process.env.MASS_DB_SRVC_URL}/subscription/${subscriptionKey}/usage-limit-threshold`,
    { threshold },
    {},
    tracing.correlationId,
    tracing.requestId,
    tracing.spanIds
  );
}

async function updateUnexpectedUsageInDb(subscriptionKey, threshold, tracing) {
  return axiosHelper.put(
    `${process.env.MASS_DB_SRVC_URL}/subscription/${subscriptionKey}/unexpected-usage-threshold`,
    { threshold },
    {},
    tracing.correlationId,
    tracing.requestId,
    tracing.spanIds
  );
}


module.exports = {
  saveSubscriptionToDb,
  updateSubscriptionDetails,
  deactivateSubscription,
  getReadings,
  getYearlyCompensation,
  getExtendedCompensation,
  getReportedOutages,
  getOutages,
  updateUsageLimitInDb,
  updateUnexpectedUsageInDb
};
