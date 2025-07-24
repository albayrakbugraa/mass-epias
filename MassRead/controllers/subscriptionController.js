const { v4: uuidv4 } = require("uuid");
const xml2js = require("xml2js");
const logger = require("../utils/logger");
const ccbService = require("../services/subscriptionCcbService");
const subscriptionService = require("../services/subscriptionService");

const xmlParser = new xml2js.Parser({
  explicitArray: false,
  ignoreAttrs: true,
});


function generateTracing(req, label = "MassRead-Subscription") {
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

// POST /subscription/check CCB
exports.checkSubscription = async (req, res) => {
  const tracing = generateTracing(req);
  const { requestId, ...safeTracing } = tracing;
  const event = "POST /subscription/check";
  const { installationNumber, type, tckn, vkn } = req.body;

  logger.info(
    "Abonelik kontrol isteği alındı",
    logContext(event, tracing, { installationNumber, type, tckn, vkn })
  );

  if (!installationNumber || !type || (!tckn && !vkn)) {
    logger.warn("Eksik parametre", logContext(event, tracing));
    return res.sendResponse({
      status: 422,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)validation-422",
          errorMessage:
            "Eksik parametreler: installationNumber, type ve (tckn veya vkn) zorunludur.",
        },
      ],
    });
  }

  try {
    const xmlRequest = ccbService.buildSubscriptionCheckXml({
      installationNumber,
      type,
      tckn,
      vkn,
    });
    const responseXml = await ccbService.callCcb(
      xmlRequest,
      tracing.correlationId,
      "check"
    );
    const parsed = await ccbService.parseSubscriptionCheckResponse(responseXml);

    if (parsed.valid) {
      await subscriptionService.saveSubscriptionToDb(
        {
          subscriptionKey: parsed.subscriptionKey,
          installationNumber,
          type: parsed.type,
          tckn,
          vkn,
          startDate: parsed.startDate,
        },
        tracing
      );

      logger.info(
        "Abonelik geçerli, kaydedildi",
        logContext(event, tracing, { subscriptionKey: parsed.subscriptionKey })
      );

      return res.sendResponse({
        status: 200,
        ...safeTracing,
        successMessage: "Abonelik başarıyla doğrulandı.",
        body: {
          valid: true,
          subscriptionKey: parsed.subscriptionKey,
          type: parsed.type,
          startDate: parsed.startDate,
        },
      });
    } else {
      const statusCode = parsed.responseCode || 404;
      const errorMsg =
        {
          400: "Bilgiler hatalı.",
          403: "Yetkisiz erişim.",
          404: "Tesisat bulunamadı.",
        }[statusCode] || "Abonelik bilgileri doğrulanamadı.";
      logger.warn(
        "Abonelik doğrulanamadı",
        logContext(event, tracing, { statusCode, errorMsg })
      );

      return res.sendResponse({
        status: statusCode,
        ...safeTracing,
        errors: [
          {
            errorCode: `(MassRead)subscription-${statusCode}`,
            errorMessage: errorMsg,
          },
        ],
        body: { valid: false },
      });
    }
  } catch (err) {
    logger.error(
      "Abonelik kontrolü hatası",
      logContext(event, tracing, {
        errorMessage: err.message,
        stack: err.stack,
        response: err.response?.data,
        status: err.response?.status,
      })
    );
    return res.sendResponse({
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
};

//GET /subscription/{subscriptionKey} CCB
exports.getSubscriptionDetails = async (req, res) => {
  const tracing = generateTracing(req);
  const event = "GET /subscription/:subscriptionKey";
  const subscriptionKey = req.params.subscriptionKey;

  logger.info(
    "Abonelik detay sorgusu alındı",
    logContext(event, tracing, { subscriptionKey })
  );

  if (!subscriptionKey) {
    logger.warn("Eksik subscriptionKey", logContext(event, tracing));
    return res.sendResponse({
      status: 422,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)validation-422",
          errorMessage: "subscriptionKey parametresi zorunludur.",
        },
      ],
    });
  }

  try {
    const xmlRequest = ccbService.buildSubscriptionKeyQueryXml(subscriptionKey);
    const rawXml = await ccbService.callCcb(
      xmlRequest,
      tracing.correlationId,
      "key"
    );
    const parsed = await ccbService.parseSubscriptionKeyResponse(rawXml);

    await subscriptionService.updateSubscriptionDetails(
      { subscriptionKey, ...parsed },
      tracing
    );

    return res.sendResponse({
      status: 200,
      ...safeTracing,
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
    logger.error(
      "Detay sorgusu hatası",
      logContext(event, tracing, {
        errorMessage: err.message,
        stack: err.stack,
        response: err.response?.data,
        status: err.response?.status,
      })
    );
    return res.sendResponse({
      status: 404,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)subscription-404",
          errorMessage: "Abonelik detayı bulunamadı veya silinmiş.",
        },
      ],
    });
  }
};

//GET /subscription/:subscriptionKey/reported-outages
exports.getReportedOutages = async (req, res) => {
  const tracing = generateTracing(req);
  const event = "GET /subscription/:subscriptionKey/reported-outages";
  const { subscriptionKey } = req.params;
  const { start, end } = req.query;
  const { requestId, ...safeTracing } = tracing;

  logger.info(
    "Kesinti ve Tazminat Bilgisi sorgu isteği alındı",
    logContext(event, tracing, { subscriptionKey, start, end })
  );

  if (!subscriptionKey || !start || !end) {
    logger.warn("Eksik parametre", logContext(event, tracing));
    return res.sendResponse({
      status: 422,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)validation-422",
          errorMessage:
            "subscriptionKey, start ve end parametreleri zorunludur.",
        },
      ],
    });
  }

  try {
    const data = await subscriptionService.getReportedOutages(
      subscriptionKey,
      start,
      end,
      tracing
    );

    logger.info(
      "Kesinti ve Tazminat Bilgisi sorgusu başarıyla tamamlandı",
      logContext(event, tracing, {
        resultCount: Array.isArray(data?.outages) ? data.outages.length : 0,
      })
    );

    return res.sendResponse({
      status: 200,
      ...safeTracing,
      body: data,
    });
  } catch (err) {
    logger.error(
      "Kesinti ve Tazminat Bilgisi sorgusu sırasında hata oluştu",
      logContext(event, tracing, {
        errorMessage: err.message,
        stack: err.stack,
        response: err.response?.data,
        status: err.response?.status,
      })
    );

    return res.sendResponse({
      status: 500,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)internal-error",
          errorMessage: err.message || "Bilinmeyen hata",
        },
      ],
    });
  }
};

//PUT /subscription/:subscriptionKey/usage-limit-threshold CCB
exports.updateUsageLimitThreshold = async (req, res) => {
  const tracing = generateTracing(req);
  const event = "PUT /subscription/:subscriptionKey/usage-limit-threshold";
  const { subscriptionKey } = req.params;
  const { threshold } = req.body;

  logger.info(
    "Kullanım eşiği güncelleme isteği",
    logContext(event, tracing, { subscriptionKey, threshold })
  );

  if (!subscriptionKey || typeof threshold !== "number") {
    logger.warn("Eksik veya hatalı parametre", logContext(event, tracing));
    return res.sendResponse({
      status: 422,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)validation-422",
          errorMessage: "subscriptionKey ve numeric threshold zorunludur.",
        },
      ],
    });
  }

  try {
    const xml = ccbService.buildUsageLimitThresholdXml(
      subscriptionKey,
      threshold
    );
    const response = await ccbService.callCcb(
      xml,
      tracing.correlationId,
      "usageLimit"
    );
    const result = await ccbService.parseUsageLimitThresholdResponse(response);

    if (result.status === "success" && result.responseCode === "200") {
      await subscriptionService.updateUsageLimitInDb(
        subscriptionKey,
        threshold,
        tracing
      );
      logger.info("Eşik başarıyla güncellendi", logContext(event, tracing));
      return res.sendResponse({
        status: 200,
        ...safeTracing,
        successMessage: "Eşik değer başarıyla güncellendi.",
        body: { status: "success" },
      });
    } else {
      logger.warn(
        "CCB'den olumsuz yanıt alındı",
        logContext(event, tracing, result)
      );
      return res.sendResponse({
        status: 500,
        ...safeTracing,
        errors: [
          {
            errorCode: "(MassRead)ccb-failed",
            errorMessage: "Threshold güncellemesi başarısız oldu.",
          },
        ],
      });
    }
  } catch (err) {
    logger.error(
      "Threshold güncelleme hatası",
      logContext(event, tracing, {
        errorMessage: err.message,
        stack: err.stack,
        response: err.response?.data,
        status: err.response?.status,
      })
    );
    return res.sendResponse({
      status: 500,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)internal-error",
          errorMessage: err.message || "Bilinmeyen hata",
        },
      ],
    });
  }
};

//PUT /subscription/:subscriptionKey/unexpected-usage-threshold CCB
exports.updateUnexpectedUsageThreshold = async (req, res) => {
  const tracing = generateTracing(req);
  const event = "PUT /subscription/:subscriptionKey/unexpected-usage-threshold";
  const { subscriptionKey } = req.params;
  const { threshold } = req.body;

  logger.info(
    "Beklenmedik kullanım eşiği güncelleme isteği",
    logContext(event, tracing, { subscriptionKey, threshold })
  );

  if (!subscriptionKey || typeof threshold !== "number") {
    logger.warn("Eksik veya hatalı parametre", logContext(event, tracing));
    return res.sendResponse({
      status: 422,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)validation-422",
          errorMessage: "subscriptionKey ve numeric threshold zorunludur.",
        },
      ],
    });
  }

  try {
    const xml = ccbService.buildUnexpectedUsageThresholdXml(
      subscriptionKey,
      threshold
    );
    const response = await ccbService.callCcb(
      xml,
      tracing.correlationId,
      "unexpectedUsage"
    );
    const result = await ccbService.parseUnexpectedUsageThresholdResponse(
      response
    );

    if (result.status === "success" && result.responseCode === "200") {
      await subscriptionService.updateUnexpectedUsageInDb(
        subscriptionKey,
        threshold,
        tracing
      );
      logger.info(
        "Beklenmedik eşik başarıyla güncellendi",
        logContext(event, tracing)
      );
      return res.sendResponse({
        status: 200,
        ...safeTracing,
        successMessage: "Eşik değer başarıyla güncellendi.",
        body: { status: "success" },
      });
    } else {
      logger.warn(
        "CCB olumsuz yanıt verdi",
        logContext(event, tracing, result)
      );
      return res.sendResponse({
        status: 500,
        ...safeTracing,
        errors: [
          {
            errorCode: "(MassRead)ccb-failed",
            errorMessage: "Beklenmedik tüketim eşiği güncellemesi başarısız.",
          },
        ],
      });
    }
  } catch (err) {
    logger.error(
      "Eşik güncelleme hatası",
      logContext(event, tracing, {
        errorMessage: err.message,
        stack: err.stack,
        response: err.response?.data,
        status: err.response?.status,
      })
    );

    return res.sendResponse({
      status: 500,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)internal-error",
          errorMessage: err.message || "Bilinmeyen hata",
        },
      ],
    });
  }
};

//GET /subscription/{subscriptionKey}/readings
exports.getReadings = async (req, res) => {
  const tracing = generateTracing(req);
  const event = "GET /subscription/:subscriptionKey/readings";
  const { subscriptionKey } = req.params;

  logger.info(
    "Tüketim verileri sorgusu alındı",
    logContext(event, tracing, { subscriptionKey })
  );

  if (!subscriptionKey) {
    logger.warn("Eksik subscriptionKey", logContext(event, tracing));
    return res.sendResponse({
      status: 422,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)validation-422",
          errorMessage: "subscriptionKey parametresi zorunludur.",
        },
      ],
    });
  }

  try {
    const data = await subscriptionService.getReadings(
      subscriptionKey,
      tracing
    );

    logger.info(
      "Tüketim verileri başarıyla alındı",
      logContext(event, tracing, {
        resultCount: data?.readings?.length || 0,
      })
    );

    return res.sendResponse({
      status: 200,
      ...safeTracing,
      body: data,
    });
  } catch (err) {
    logger.error(
      "Tüketim verileri alınırken hata oluştu",
      logContext(event, tracing, {
        errorMessage: err.message,
        stack: err.stack,
        response: err.response?.data,
        status: err.response?.status,
      })
    );

    return res.sendResponse({
      status: 500,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)internal-error",
          errorMessage: err.message || "Tüketim verisi alınamadı.",
        },
      ],
    });
  }
};

//GET /subscription/{subscriptionKey}/outages
exports.getOutages = async (req, res) => {
  const tracing = generateTracing(req);
  const { requestId, ...safeTracing } = tracing;
  const event = "GET /subscription/:subscriptionKey/outages";
  const { subscriptionKey } = req.params;
  const { start, end } = req.query;

  logger.info(
    "Kesinti verisi sorgusu alındı",
    logContext(event, tracing, { subscriptionKey, start, end })
  );

  if (!subscriptionKey || !start || !end) {
    return res.sendResponse({
      status: 422,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)validation-422",
          errorMessage:
            "subscriptionKey, start ve end parametreleri zorunludur.",
        },
      ],
    });
  }

  try {
    const result = await subscriptionService.getOutages(
      subscriptionKey,
      start,
      end,
      tracing
    );

    return res.sendResponse({
      status: 200,
      ...safeTracing,
      body: result,
    });
  } catch (err) {
    logger.error(
      "Kesinti verisi sorgusu hatası",
      logContext(event, tracing, {
        errorMessage: err.message,
        stack: err.stack,
        response: err.response?.data,
        status: err.response?.status,
      })
    );
    return res.sendResponse({
      status: 500,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)internal-error",
          errorMessage: err.message || "Beklenmeyen bir hata oluştu.",
        },
      ],
    });
  }
};

//GET /subscription/{subscriptionKey}/compensation/yearly
exports.getYearlyCompensations = async (req, res) => {
  const tracing = generateTracing(req);
  const event = "GET /subscription/:subscriptionKey/compensation/yearly";
  const { subscriptionKey } = req.params;
  const { start, end } = req.query;

  logger.info(
    "Yıllık tazminat sorgusu alındı",
    logContext(event, tracing, { subscriptionKey, start, end })
  );

  if (!subscriptionKey || !start || !end) {
    return res.sendResponse({
      status: 422,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)validation-422",
          errorMessage: "subscriptionKey, start ve end zorunludur.",
        },
      ],
    });
  }

  try {
    const data = await subscriptionService.getYearlyCompensation(
      subscriptionKey,
      start,
      end,
      tracing
    );

    return res.sendResponse({
      status: 200,
      ...safeTracing,
      body: data,
    });
  } catch (err) {
    logger.error(
      "Yıllık tazminat verisi alınamadı",
      logContext(event, tracing, {
        errorMessage: err.message,
        stack: err.stack,
        response: err.response?.data,
        status: err.response?.status,
      })
    );

    return res.sendResponse({
      status: 500,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)internal-error",
          errorMessage: err.message || "Yıllık tazminat verisi alınamadı.",
        },
      ],
    });
  }
};

//GET /subscription/{subscriptionKey}/compensation/extended
exports.getExtendedCompensations = async (req, res) => {
  const tracing = generateTracing(req);
  const event = "GET /subscription/:subscriptionKey/compensation/extended";
  const { subscriptionKey } = req.params;
  const { start, end } = req.query;

  logger.info(
    "Genişletilmiş tazminat sorgusu alındı",
    logContext(event, tracing, { subscriptionKey, start, end })
  );

  if (!subscriptionKey || !start || !end) {
    return res.sendResponse({
      status: 422,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)validation-422",
          errorMessage: "subscriptionKey, start ve end zorunludur.",
        },
      ],
    });
  }

  try {
    const data = await subscriptionService.getExtendedCompensation(
      subscriptionKey,
      start,
      end,
      tracing
    );

    return res.sendResponse({
      status: 200,
      ...safeTracing,
      body: data,
    });
  } catch (err) {
    logger.error(
      "Genişletilmiş tazminat verisi alınamadı",
      logContext(event, tracing, {
        errorMessage: err.message,
        stack: err.stack,
        response: err.response?.data,
        status: err.response?.status,
      })
    );

    return res.sendResponse({
      status: 500,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)internal-error",
          errorMessage:
            err.message || "Genişletilmiş tazminat verisi alınamadı.",
        },
      ],
    });
  }
};

//DELETE /subscription/:subscriptionKey
exports.deleteSubscription = async (req, res) => {
  const tracing = generateTracing(req);
  const event = "DELETE /subscription/:subscriptionKey";
  const { subscriptionKey } = req.params.subscriptionKey;

  logger.info(
    "Abonelik silme isteği alındı",
    logContext(event, tracing, { subscriptionKey })
  );

  if (!subscriptionKey) {
    logger.warn("Eksik subscriptionKey", logContext(event, tracing));
    return res.sendResponse({
      status: 422,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)validation-422",
          errorMessage: "subscriptionKey parametresi zorunludur.",
        },
      ],
    });
  }

  try {
    const xml = ccbService.buildSubscriptionDeleteXml(subscriptionKey);
    const response = await ccbService.callCcb(
      xml,
      tracing.correlationId,
      "delete"
    );
    const result = await ccbService.parseSubscriptionDeleteResponse(response);

    if (result.status === "success" && result.responseCode === "200") {
      await subscriptionService.deactivateSubscription(
        subscriptionKey,
        tracing
      );
      logger.info("Abonelik başarıyla silindi", logContext(event, tracing));

      return res.sendResponse({
        status: 200,
        ...safeTracing,
        successMessage: "Abonelik başarıyla silindi.",
        body: { status: "success" },
      });
    } else {
      logger.warn(
        "CCB'den başarısız yanıt",
        logContext(event, tracing, result)
      );
      return res.sendResponse({
        status: 500,
        ...safeTracing,
        errors: [
          {
            errorCode: "(MassRead)ccb-failed",
            errorMessage: "Abonelik silinemedi.",
          },
        ],
      });
    }
  } catch (err) {
    logger.error(
      "Abonelik silme sırasında hata oluştu",
      logContext(event, tracing, {
        errorMessage: err.message,
        stack: err.stack,
        response: err.response?.data,
        status: err.response?.status,
      })
    );

    return res.sendResponse({
      status: 500,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)internal-error",
          errorMessage: err.message || "Bilinmeyen hata",
        },
      ],
    });
  }
};
