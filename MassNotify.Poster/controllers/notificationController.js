const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const webhookService = require("../services/webhookService");

exports.updateWebhookUrl = async (req, res) => {
    const correlationId = req.headers["x-correlation-id"] || uuidv4();
    const spanIds = "(MassNotify-Poster)-" + uuidv4();
    const { url } = req.body;

    logger.info("[PUT /notifications/webhook] Talep alındı", { correlationId, url });

    if (!url || typeof url !== "string" || !/^https?:\/\//.test(url)) {
        logger.warn("[PUT /notifications/webhook] Geçersiz URL", { correlationId });
        return res.status(422).json({
            status: 422,
            spanIds,
            correlationId,
            errors: [{
                errorCode: "(Poster)validation-422",
                errorMessage: "Geçerli bir webhook URL zorunludur."
            }]
        });
    }

    try {
        // Webhook kaydı ve anahtar üretimini servis katmanına aktar
        const publicKey = await webhookService.setWebhookUrlAndRegenerateKeys(url);
        logger.info("[PUT /notifications/webhook] Webhook ve public key üretildi", { correlationId });
        return res.status(200).json({
            status: 200,
            spanIds,
            correlationId,
            body: { publicKey }
        });
    } catch (err) {
        logger.error("[PUT /notifications/webhook] Hata", { correlationId, error: err.message });
        return res.status(500).json({
            status: 500,
            spanIds,
            correlationId,
            errors: [{
                errorCode: "(Poster)internal-error",
                errorMessage: err.message
            }]
        });
    }
};
