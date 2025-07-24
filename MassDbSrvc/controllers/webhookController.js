const { insertWebhookKey } = require("../services/webhookService");
const logger = require("../utils/logger");
const { verifySignature } = require("../utils/cryptoHelper");

function getTracingFromHeaders(req, defaultEvent) {
  return {
    correlationId: req.headers["x-correlation-id"] || "N/A",
    requestId: req.headers["x-request-id"] || "N/A",
    spanIds: req.headers["x-span-ids"] || "N/A",
    signature: req.headers["x-signature"] || null,
    event: defaultEvent,
  };
}

exports.setWebhook = async (req, res) => {
  const { url, publicKey, privateKey } = req.body;
  const tracing = getTracingFromHeaders(req, "PUT /notifications/webhook");

  logger.info("Webhook ayarlama isteği", {
    ...tracing,
    url,
    publicKey,
  });

  // Signature kontrolü
  const isValidSignature = verifySignature(
    { url, publicKey },
    tracing.signature
  );
  if (!isValidSignature) {
    logger.warn("X-Signature doğrulanamadı", {
      ...tracing,
      url,
    });
    return res.status(401).json({
      status: 401,
      errors: [
        {
          errorCode: "(MassDbSrvc)unauthorized-signature",
          errorMessage: "Geçersiz imza. Webhook ayarlanamadı.",
        },
      ],
    });
  }

  try {
    await insertWebhookKey({ url, publicKey, privateKey }, tracing);

    logger.info("Webhook ve anahtarlar kaydedildi", {
      ...tracing,
      url,
      publicKey,
    });

    return res.status(200).json({
      status: 200,
      successMessage: "Webhook ve anahtarlar başarıyla kaydedildi.",
    });
  } catch (err) {
    logger.error("Webhook ve anahtarlar kaydedilirken hata oluştu", {
      ...tracing,
      url,
      publicKey,
      errorMessage: err.message,
      stack: err.stack,
    });
    return res.status(500).json({
      status: 500,
      errors: [
        {
          errorCode: "(MassDbSrvc)internal-500",
          errorMessage: err.message || "Veritabanı hatası oluştu",
        },
      ],
    });
  }
};
