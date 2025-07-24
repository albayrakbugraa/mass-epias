const logger = require("../utils/logger");
const subscriptionService = require("../services/subscriptionService");

function getTracingFromHeaders(req, defaultEvent) {
  return {
    correlationId: req.headers["x-correlation-id"] || "N/A",
    requestId: req.headers["x-request-id"] || "N/A",
    spanIds: req.headers["x-span-ids"] || "N/A",
    event: defaultEvent,
  };
}

//POST /subscription/check
exports.saveSubscription = async (req, res) => {
  const { subscriptionKey, installationNumber, type, tckn, vkn, startDate } =
    req.body;
  const tracing = getTracingFromHeaders(req, "POST /subscription/check");

  logger.info("Abonelik kaydetme isteği alındı", {
    ...tracing,
    subscriptionKey,
    installationNumber,
    type,
    tckn,
    vkn,
    startDate,
  });

  try {
    await subscriptionService.saveSubscription(req.body, tracing);

    logger.info("Abonelik başarıyla kaydedildi", {
      ...tracing,
      subscriptionKey,
    });

    return res.status(200).json({
      status: 200,
      successMessage: "Abonelik verisi başarıyla kaydedildi.",
    });
  } catch (err) {
    logger.error("Abonelik verisi kaydedilirken hata oluştu", {
      ...tracing,
      subscriptionKey,
      errorMessage: err.message,
      stack: err.stack,
    });

    return res.status(500).json({
      status: 500,
      errors: [
        {
          errorCode: "(MassDbSrvc)db-error",
          errorMessage: err.message || "Veritabanı hatası oluştu",
        },
      ],
    });
  }
};

// GET /subscription/{subscriptionKey}
exports.saveSubscriptionDetails = async (req, res) => {
  const tracing = getTracingFromHeaders(
    req,
    "GET /subscription/{subscriptionKey}"
  );

  logger.info("Abonelik detay kaydetme isteği alındı", {
    ...tracing,
    subscriptionKey: req.body?.subscriptionKey,
  });

  try {
    await subscriptionService.saveSubscriptionDetails(req.body, tracing);

    logger.info("Abonelik detayları başarıyla kaydedildi", {
      ...tracing,
      subscriptionKey: req.body?.subscriptionKey,
    });

    res.status(200).json({
      status: 200,
      successMessage: "Abonelik detayları güncellendi.",
    });
  } catch (err) {
    logger.error("Abonelik detayları kaydedilirken hata oluştu", {
      ...tracing,
      subscriptionKey,
      errorMessage: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      status: 500,
      errors: [
        {
          errorCode: "(MassDbSrvc)db-error",
          errorMessage: err.message || "Detay güncellenemedi",
        },
      ],
    });
  }
};

// GET /subscription/:subscriptionKey/readings !!!EKSİK
exports.getReadings = (req, res) => {};

//GET /subscription/{subscriptionKey}/reported-outages !!!EKSİK
exports.getReportedOutages = async (req, res) => {
  const tracing = getTracingFromHeaders(
    req,
    "GET /subscription/{subscriptionKey}/reported-outages"
  );
  const { subscriptionKey, start, end } = req.query;
  logger.info(
    "Kesinti ve tazminat (tedarik sürekliliği raporu) bilgileri isteği alındı",
    {
      ...tracing,
      subscriptionKey,
      start,
      end,
    }
  );

  try {
    const result = await subscriptionService.getReportedOutages(
      req.body,
      tracing
    );
    logger.info(
      "Kesinti ve tazminat (tedarik sürekliliği raporu) bilgileri başarıyla çekildi.",
      {
        ...tracing,
        subscriptionKey,
      }
    );
    res.status(200).json(result);
  } catch (err) {
    logger.error(
      "Kesinti ve tazminat (tedarik sürekliliği raporu) bilgileri çekilirken hata oluştu",
      {
        ...tracing,
        subscriptionKey,
        errorMessage: err.message,
        stack: err.stack,
      }
    );

    res.status(500).json({
      status: 500,
      correlationId: tracing.correlationId,
      spanIds: tracing.spanIds,
      errors: [
        {
          errorCode: "(MassDbSrvc)db-error",
          errorMessage:
            err.message || "Tedarik sürekliliği raporu çekilirken hata.",
        },
      ],
    });
  }
};

//GET /subscription/{subscriptionKey}/outages !!!EKSİK
exports.getOutages = async (req, res) => {
  const tracing = getTracingFromHeaders(
    req,
    "GET /subscription/{subscriptionKey}/outages"
  );
  const { subscriptionKey, start, end } = req.query;
  logger.info("Bildirilen kesinti bilgileri isteği alındı.", {
    ...tracing,
    subscriptionKey,
    start,
    end,
  });

  try {
    const result = await subscriptionService.getReportedOutages(
      subscriptionKey,
      start,
      end
    );
    logger.info("Bildirilen kesinti bilgileri başarıyla çekildi.", {
      ...tracing,
      subscriptionKey,
    });
    res.status(200).json(result);
  } catch (err) {
    logger.error("Bildirilen kesinti bilgileri çekilirken hata oluştu", {
      ...tracing,
      subscriptionKey,
      errorMessage: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      status: 500,
      correlationId: tracing.correlationId,
      spanIds: tracing.spanIds,
      errors: [
        {
          errorCode: "(MassDbSrvc)db-error",
          errorMessage:
            err.message || "Bildirilen kesinti bilgileri çekilirken hata.",
        },
      ],
    });
  }
};

//GET /subscription/{subscriptionKey}/compensation/yearly !!!EKSİK
exports.getYearlyCompensation = async (req, res) => {
  const tracing = getTracingFromHeaders(
    req,
    "GET /subscription/{subscriptionKey}/compensation/yearly "
  );
  const { subscriptionKey, start, end } = req.query;
  logger.info(
    "Bildirilen yıllık kesinti tazminat durumu bilgileri isteği alındı.",
    {
      ...tracing,
      subscriptionKey,
      start,
      end,
    }
  );

  try {
    const result = await subscriptionService.getReportedOutages(
      subscriptionKey,
      start,
      end
    );
    logger.info(
      "Bildirilen yıllık kesinti tazminat durumu bilgileri başarıyla çekildi.",
      {
        ...tracing,
        subscriptionKey,
      }
    );
    res.status(200).json(result);
  } catch (err) {
    logger.error(
      "Bildirilen yıllık kesinti tazminat durumu bilgileri çekilirken hata oluştu",
      {
        ...tracing,
        subscriptionKey,
        errorMessage: err.message,
        stack: err.stack,
      }
    );

    res.status(500).json({
      status: 500,
      correlationId: tracing.correlationId,
      spanIds: tracing.spanIds,
      errors: [
        {
          errorCode: "(MassDbSrvc)db-error",
          errorMessage:
            err.message ||
            "Bildirilen yıllık kesinti tazminat durumu bilgileri çekilirken hata.",
        },
      ],
    });
  }
};

//GET /subscription/{subscriptionKey}/compensation/extended !!!EKSİK
exports.getExtendedCompensation = async (req, res) => {
  const tracing = getTracingFromHeaders(
    req,
    "GET /subscription/{subscriptionKey}/compensation/extended"
  );
  const { subscriptionKey, start, end } = req.query;
  logger.info(
    "Bildirilen uzun süreli kesinti tazminat durumu bilgileri isteği alındı.",
    {
      ...tracing,
      subscriptionKey,
      start,
      end,
    }
  );

  try {
    const result = await subscriptionService.getReportedOutages(
      subscriptionKey,
      start,
      end
    );
    logger.info(
      "Bildirilen uzun süreli kesinti tazminat durumu bilgileri başarıyla çekildi.",
      {
        ...tracing,
        subscriptionKey,
      }
    );
    res.status(200).json(result);
  } catch (err) {
    logger.error(
      "Bildirilen uzun süreli kesinti tazminat durumu bilgileri çekilirken hata oluştu",
      {
        ...tracing,
        subscriptionKey,
        errorMessage: err.message,
        stack: err.stack,
      }
    );

    res.status(500).json({
      status: 500,
      correlationId: tracing.correlationId,
      spanIds: tracing.spanIds,
      errors: [
        {
          errorCode: "(MassDbSrvc)db-error",
          errorMessage:
            err.message ||
            "Bildirilen uzun süreli kesinti tazminat durumu bilgileri çekilirken hata.",
        },
      ],
    });
  }
};

// PUT /subscription/:subscriptionKey/unexpected-usage-threshold
exports.updateUnexpectedUsageThreshold = async (req, res) => {
  const { subscriptionKey } = req.params;
  const { threshold } = req.body;
  const tracing = getTracingFromHeaders(
    req,
    "PUT /subscription/:subscriptionKey/unexpected-usage-threshold"
  );

  logger.info("Aşırı Tüketim Eşiği Güncelleme isteği alındı", {
    ...tracing,
    subscriptionKey,
    threshold,
  });

  try {
    await subscriptionService.updateUnexpectedUsageThreshold(
      subscriptionKey,
      threshold,
      tracing
    );

    logger.info("Aşırı Tüketim Eşiği güncellendi. ", {
      ...tracing,
      subscriptionKey,
      threshold,
    });

    return res.status(200).json({
      status: 200,
      successMessage: "Aşırı Tüketim Eşiği güncellendi.",
      body: { subscriptionKey },
    });
  } catch (err) {
    logger.error("Aşırı Tüketim Eşiği Güncellenirken hata oluştu.", {
      ...tracing,
      subscriptionKey,
      errorMessage: err.message,
      stack: err.stack,
    });

    return res.status(500).json({
      status: 500,
      errors: [
        {
          errorCode: "(MassDbSrvc)db-error",
          errorMessage: err.message || "Veritabanı hatası oluştu",
        },
      ],
    });
  }
};

// PUT /subscription/:subscriptionKey/usage-limit-threshold
exports.updateUsageLimitThreshold = async (req, res) => {
  const { subscriptionKey } = req.params;
  const { threshold } = req.body;
  const tracing = getTracingFromHeaders(
    req,
    "PUT /subscription/:subscriptionKey/usage-limit-threshold"
  );

  logger.info("Tüketim Limiti Güncelleme isteği alındı", {
    ...tracing,
    subscriptionKey,
    threshold,
  });

  try {
    await subscriptionService.updateUnexpectedUsageThreshold(
      subscriptionKey,
      threshold,
      tracing
    );

    logger.info("Tüketim Limiti Güncellendi.", {
      ...tracing,
      subscriptionKey,
      threshold,
    });

    return res.status(200).json({
      status: 200,
      successMessage: "Tüketim Limiti Güncellendi.",
      body: { subscriptionKey },
    });
  } catch (err) {
    logger.error("Tüketim Limiti Güncellenirken hata oluştu", {
      ...tracing,
      subscriptionKey,
      errorMessage: err.message,
      stack: err.stack,
    });

    return res.status(500).json({
      status: 500,
      errors: [
        {
          errorCode: "(MassDbSrvc)db-error",
          errorMessage: err.message || "Veritabanı hatası oluştu",
        },
      ],
    });
  }
};

// DELETE /subscription/{subscriptionKey}
exports.deactivateSubscription = async (req, res) => {
  const tracing = getTracingFromHeaders(
    req,
    "DELETE /subscription/{subscriptionKey}"
  );
  const subscriptionKey = req.params.subscriptionKey;

  logger.info("Abonelik pasif hale getirme isteği alındı", {
    ...tracing,
    subscriptionKey,
  });

  try {
    await subscriptionService.deactivateSubscription(subscriptionKey, tracing);

    logger.info("Abonelik başarıyla pasife çekildi", {
      ...tracing,
      subscriptionKey,
    });

    res.status(200).json({
      status: 200,
      successMessage: "Abonelik başarıyla pasife çekildi.",
    });
  } catch (err) {
    logger.error("Abonelik pasife çekilirken hata oluştu", {
      ...tracing,
      subscriptionKey,
      errorMessage: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      status: 500,
      correlationId: tracing.correlationId,
      spanIds: tracing.spanIds,
      errors: [
        {
          errorCode: "(MassDbSrvc)db-error",
          errorMessage: err.message || "Pasife çekme başarısız",
        },
      ],
    });
  }
};
