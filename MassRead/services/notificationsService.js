const axiosHelper = require("../utils/axiosHelper");

async function updateWebhook(data, tracing) {
  const { url, publicKey, headers } = data;
  return axiosHelper.put(
    `${process.env.MASS_DB_SRVC_URL}/notifications/webhook`,
    { url, publicKey },
    headers || {},
    tracing.correlationId,
    tracing.requestId,
    tracing.spanIds
  );
}

module.exports = {
  updateWebhook,
};
