const mLib = require("../Libs/Ala00Lib");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

function generateTracing(req, label = "MassRead-Version") {
  return {
    correlationId: req.headers["x-correlation-id"] || uuidv4(),
    requestId: req.headers["x-request-id"] || uuidv4(),
    spanIds: `(${label})-${uuidv4()}`,
  };
}

function logContext(event, tracing, extra = {}) {
  return {
    event,
    ...tracing,
    ...extra,
  };
}

//7.3	GET /versions
async function getVersions(req, res) {
  const supportedVersions = ["v1"];
  const event = "GET /versions";
  const { requestId, ...safeTracing } = tracing;

  try {
    logger.info(
      "Versiyon bilgisi döndürülüyor.",
      logContext(event, tracing, { version: supportedVersions })
    );

    res.sendResponse({
      status: 200, // Sadece numeric code ver, middleware otomatik açıklama ekler
      ...safeTracing,
      body: supportedVersions,
    });
  } catch (err) {
    logger.error(
      "Versiyon hatası",
      logContext(event, tracing, {
        errorMessage: err.message,
        stack: err.stack,
        response: err.response?.data,
        status: err.response?.status,
      })
    );

    res.sendResponse({
      status: 500,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)internal-error",
          errorMessage: err.message || "Bilinmeyen hata oluştu",
        },
      ],
    });
  }
}

module.exports = {
  getVersions,
};
