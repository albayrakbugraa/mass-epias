const { v4: uuidv4 } = require("uuid");
const xml2js = require("xml2js");
const logger = require("../utils/logger");
const ccbService = require("../services/ccbService");
const subscriptionService = require("../services/subscriptionService");

const xmlParser = new xml2js.Parser({
  explicitArray: false,
  ignoreAttrs: true,
});

//7.4 POST /subscription/check
exports.checkSubscription = async (req, res) => {
  const correlationId = req.headers["x-correlation-id"] || uuidv4();
  logger.info("[POST /subscription/check] Talep alındı.", { correlationId });
  const spanId = "(MassRead)" + uuidv4();

  const { installationNumber, type, tckn, vkn } = req.body;

  if (!installationNumber || !type || (!tckn && !vkn)) {
    logger.warn("[POST /subscription/check] Geçersiz istek. Eksik parametre.", {
      correlationId,
    });
    return res.sendResponse({
      status: 422,
      spanIds: spanId,
      correlationId,
      errors: [
        {
          errorCode: "(EDAS)validation-422",
          errorMessage:
            "Eksik parametreler: installationNumber, type ve (tckn veya vkn) zorunludur.",
        },
      ],
    });
  }

  try {
    logger.info("[POST /subscription/check] XML istek hazırlanıyor...", {
      correlationId,
      installationNumber,
      type,
      tckn,
      vkn,
    });
    const xmlRequest = ccbService.buildSubscriptionCheckXml({
      installationNumber,
      type,
      tckn,
      vkn,
    });

    logger.info("[POST /subscription/check] CCB servisi çağrılıyor...", {
      correlationId,
    });
    const ccbRawResponse = await ccbService.callCcb(xmlRequest, correlationId);

    logger.info(
      "[POST /subscription/check] CCB yanıtı alındı. Parse ediliyor...",
      { correlationId }
    );

    const parsed = await ccbService.parseSubscriptionCheckResponse(
      ccbRawResponse
    );

    
    if (parsed.valid) {
      logger.info(
        "[POST /subscription/check] Abonelik geçerli. DB kaydı başlıyor...",
        { correlationId }
      );

      await subscriptionService.saveSubscription({
        subscriptionKey: responseBody.subscriptionKey,
        installationNumber,
        type: responseBody.type,
        tckn,
        vkn,
        startDate: responseBody.startDate,
      });

      logger.info("[POST /subscription/check] Abonelik başarıyla kaydedildi.", {
        correlationId,
      });

      return res.sendResponse({
        status: 200,
        spanIds: spanId,
        correlationId,
        successMessage: "Abonelik başarıyla doğrulandı.",
        body: {
          valid: true,
          subscriptionKey: responseBody.subscriptionKey,
          type: responseBody.type,
          startDate: responseBody.startDate,
        },
      });
    } else {
      logger.warn("[POST /subscription/check] Abonelik doğrulanamadı.", {
        correlationId,
      });

      return res.sendResponse({
        status: 404,
        spanIds: spanId,
        correlationId,
        errors: [
          {
            errorCode: "(EDAS)subscription-404",
            errorMessage: "Abonelik bilgileri doğrulanamadı.",
          },
        ],
        body: {
          valid: false,
        },
      });
    }
  } catch (err) {
    logger.error("[POST /subscription/check] Hata", {
      correlationId,
      errorMessage: err.message,
    });

    return res.sendResponse({
      status: 500,
      spanIds: spanId,
      correlationId,
      errors: [
        {
          errorCode: "(EDAS)internal-error",
          errorMessage: err.message || "Bilinmeyen hata",
        },
      ],
    });
  }
};

//7.5 GET /subscription/{subscriptionKey}
exports.getSubscriptionDetails = async (req, res) => {
  const correlationId = req.headers["x-correlation-id"] || uuidv4();
  const requestId = req.headers["x-request-id"] || uuidv4();
  const spanId = "(MassRead)" + uuidv4();

  const subscriptionKey = req.params.subscriptionKey;

  logger.info("[GET /subscription/:subscriptionKey] İstek alındı", {
    correlationId,
    requestId,
    subscriptionKey,
  });

  if (!subscriptionKey) {
    return res.sendResponse({
      status: 422,
      spanIds: spanId,
      correlationId,
      errors: [
        {
          errorCode: "(EDAS)validation-422",
          errorMessage: "subscriptionKey parametresi zorunludur.",
        },
      ],
    });
  }

  try {
    logger.info("[GET /subscription/:subscriptionKey] XML oluşturuluyor", {
      correlationId,
    });

    const xmlRequest = ccbService.buildSubscriptionKeyQueryXml(subscriptionKey);

    const rawXml = await ccbService.callCcb(xmlRequest, correlationId, "key");

    const parsed = await ccbService.parseSubscriptionKeyResponse(rawXml);

    logger.info("[GET /subscription/:subscriptionKey] Yanıt parse edildi", {
      correlationId,
    });

    return res.sendResponse({
      status: 200,
      spanIds: spanId,
      correlationId,
      body: {
        subscriptionDetails: {
          startDate: parsed.startDate,
          type: parsed.type,
          address: parsed.address,
          installationNumber: parsed.installationNumber,
          etsoCode: parsed.etsoCode,
          contractAccountNumber: parsed.contractAccountNumber,
        },
        notificationDetails: {
          unexpectedUsageThreshold: parsed.unexpectedUsageThreshold,
          usageLimitThreshold: parsed.usageLimitThreshold,
        },
        consumerDetails: {
          consumerGroup: parsed.consumerGroup,
          consumerClass: parsed.consumerClass,
        },
      },
    });
  } catch (err) {
    logger.error("[GET /subscription/:subscriptionKey] Hata oluştu", {
      correlationId,
      errorMessage: err.message,
    });

    return res.sendResponse({
      status: 500,
      spanIds: spanId,
      correlationId,
      errors: [
        {
          errorCode: "(EDAS)ccb-error",
          errorMessage: err.message || "Bilinmeyen hata",
        },
      ],
    });
  }
};

//7.8 PUT /subscription/{subscriptionKey}/usage-limit-threshold
exports.updateUsageLimitThreshold = async (req, res) => {
  const correlationId = req.headers["x-correlation-id"] || uuidv4();
  const spanId = "(MassRead)" + uuidv4();
  const subscriptionKey = req.params.subscriptionKey;
  const { threshold } = req.body;

  logger.info("[PUT /subscription/:subscriptionKey/usage-limit-threshold] İstek alındı", {
    correlationId,
    subscriptionKey,
    threshold
  });

  if (!subscriptionKey || typeof threshold !== "number") {
    return res.sendResponse({
      status: 422,
      spanIds: spanId,
      correlationId,
      errors: [
        {
          errorCode: "(EDAS)validation-422",
          errorMessage: "subscriptionKey ve numeric threshold zorunludur."
        }
      ]
    });
  }

  try {
    const requestXml = ccbService.buildUsageLimitThresholdXml(subscriptionKey, threshold);
    const responseXml = await ccbService.callCcb(requestXml, correlationId, "key");
    const result = await ccbService.parseUsageLimitThresholdResponse(responseXml);

    if (result.status === "success" && result.responseCode === "200") {
      logger.info("[PUT /usage-limit-threshold] Eşik başarıyla güncellendi", { correlationId });

      return res.sendResponse({
        status: 200,
        spanIds: spanId,
        correlationId,
        successMessage: "Eşik değer başarıyla güncellendi.",
        body: { status: "success" }
      });
    } else {
      logger.warn("[PUT /usage-limit-threshold] CCB'den olumsuz yanıt alındı", { correlationId });

      return res.sendResponse({
        status: 500,
        spanIds: spanId,
        correlationId,
        errors: [
          {
            errorCode: "(EDAS)ccb-failed",
            errorMessage: "Threshold güncellemesi başarısız oldu."
          }
        ]
      });
    }
  } catch (err) {
    logger.error("[PUT /usage-limit-threshold] Hata", {
      correlationId,
      errorMessage: err.message
    });

    return res.sendResponse({
      status: 500,
      spanIds: spanId,
      correlationId,
      errors: [
        {
          errorCode: "(EDAS)internal-error",
          errorMessage: err.message || "Bilinmeyen hata"
        }
      ]
    });
  }
};

//7.9 PUT /subscription/{subscriptionKey}/unexpected-usage-threshold
exports.updateUnexpectedUsageThreshold = async (req, res) => {
  const correlationId = req.headers["x-correlation-id"] || uuidv4();
  const spanId = "(MassRead)" + uuidv4();
  const subscriptionKey = req.params.subscriptionKey;
  const { threshold } = req.body;

  logger.info("[PUT /subscription/:subscriptionKey/unexpected-usage-threshold] İstek alındı", {
    correlationId,
    subscriptionKey,
    threshold
  });

  if (!subscriptionKey || typeof threshold !== "number") {
    return res.sendResponse({
      status: 422,
      spanIds: spanId,
      correlationId,
      errors: [
        {
          errorCode: "(EDAS)validation-422",
          errorMessage: "subscriptionKey ve numeric threshold zorunludur."
        }
      ]
    });
  }

  try {
    const requestXml = ccbService.buildUnexpectedUsageThresholdXml(subscriptionKey, threshold);
    const responseXml = await ccbService.callCcb(requestXml, correlationId, "key");
    const result = await ccbService.parseUnexpectedUsageThresholdResponse(responseXml);

    if (result.status === "success" && result.responseCode === "200") {
      logger.info("[PUT /unexpected-usage-threshold] Eşik başarıyla güncellendi", { correlationId });

      return res.sendResponse({
        status: 200,
        spanIds: spanId,
        correlationId,
        successMessage: "Eşik değer başarıyla güncellendi.",
        body: { status: "success" }
      });
    } else {
      logger.warn("[PUT /unexpected-usage-threshold] CCB olumsuz yanıt", { correlationId });

      return res.sendResponse({
        status: 500,
        spanIds: spanId,
        correlationId,
        errors: [
          {
            errorCode: "(EDAS)ccb-failed",
            errorMessage: "Beklenmedik tüketim eşiği güncellemesi başarısız."
          }
        ]
      });
    }
  } catch (err) {
    logger.error("[PUT /unexpected-usage-threshold] Hata", {
      correlationId,
      errorMessage: err.message
    });

    return res.sendResponse({
      status: 500,
      spanIds: spanId,
      correlationId,
      errors: [
        {
          errorCode: "(EDAS)internal-error",
          errorMessage: err.message || "Bilinmeyen hata"
        }
      ]
    });
  }
};

//7.10 DELETE /subscription/{subscriptionKey}
exports.deleteSubscription = async (req, res) => {
  const correlationId = req.headers["x-correlation-id"] || uuidv4();
  const spanId = "(MassRead)" + uuidv4();
  const subscriptionKey = req.params.subscriptionKey;

  logger.info("[DELETE /subscription/:subscriptionKey] İstek alındı", {
    correlationId,
    subscriptionKey
  });

  if (!subscriptionKey) {
    return res.sendResponse({
      status: 422,
      spanIds: spanId,
      correlationId,
      errors: [{
        errorCode: "(EDAS)validation-422",
        errorMessage: "subscriptionKey parametresi zorunludur."
      }]
    });
  }

  try {
    const requestXml = ccbService.buildSubscriptionDeleteXml(subscriptionKey);
    const responseXml = await ccbService.callCcb(requestXml, correlationId, "key");
    const result = await ccbService.parseSubscriptionDeleteResponse(responseXml);

    if (result.status === "success" && result.responseCode === "200") {
      logger.info("[DELETE /subscription] Abonelik başarıyla silindi", { correlationId });

      return res.sendResponse({
        status: 200,
        spanIds: spanId,
        correlationId,
        successMessage: "Abonelik başarıyla silindi.",
        body: { status: "success" }
      });
    } else {
      logger.warn("[DELETE /subscription] CCB'den başarısız yanıt", { correlationId });

      return res.sendResponse({
        status: 500,
        spanIds: spanId,
        correlationId,
        errors: [{
          errorCode: "(EDAS)ccb-failed",
          errorMessage: "Abonelik silinemedi."
        }]
      });
    }
  } catch (err) {
    logger.error("[DELETE /subscription] Hata", {
      correlationId,
      errorMessage: err.message
    });

    return res.sendResponse({
      status: 500,
      spanIds: spanId,
      correlationId,
      errors: [{
        errorCode: "(EDAS)internal-error",
        errorMessage: err.message || "Bilinmeyen hata"
      }]
    });
  }
};
