const { v4: uuidv4 } = require("uuid");
const xml2js = require("xml2js");
const logger = require("../utils/logger");
const ccbService = require("../services/ccbService");
const subscriptionService = require("../services/subscriptionService");

const xmlParser = new xml2js.Parser({
  explicitArray: false,
  ignoreAttrs: true,
});

async function handleSubscriptionCheck(req, res) {
  const correlationId = req.headers["x-correlation-id"] || uuidv4();
  logger.info("[POST /subscription/check] Talep alındı.", { correlationId });

  const { installationNumber, type, tckn, vkn } = req.body;

  if (!installationNumber || !type || (!tckn && !vkn)) {
    logger.warn("[POST /subscription/check] Geçersiz istek. Eksik parametre.", {
      correlationId,
    });
    return res.status(422).json({
      status: 422,
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
    const parsedResponse = await xmlParser.parseStringPromise(ccbRawResponse);

    const responseBody =
      parsedResponse["soapenv:Envelope"]?.["soapenv:Body"]?.CMSUBSCHECK
        ?.subscriptionCheckResponse;
    if (!responseBody) {
      logger.error(
        "[POST /subscription/check] Yanıt formatı beklenenden farklı.",
        { correlationId }
      );
      throw new Error("CCB yanıtı beklenen formatta değil");
    }

    if (responseBody.valid === "true") {
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
      return res.status(200).json({
        status: 200,
        correlationId,
        spanIds: "(edas-massread-service)-sub-check-success",
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
      return res.status(404).json({
        status: 404,
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
    return res.status(500).json({
      status: 500,
      correlationId,
      errors: [
        {
          errorCode: "(EDAS)internal-error",
          errorMessage: err.message || "Bilinmeyen hata",
        },
      ],
    });
  }
}

module.exports = {
  handleSubscriptionCheck,
};
