const notificationService = require("../services/webhookService");
const { v4: uuidv4 } = require("uuid");

exports.setWebhook = async (req, res) => {
  const correlationId = req.headers["x-correlation-id"] || "";
  const spanIds = "(mass-notify)" + uuidv4();
  const { url } = req.body;

  try {
    if (!url || typeof url !== "string" || !/^https?:\/\/\S+$/i.test(url)) {
      return res.sendResponse({
        status: 422,
        spanIds,
        correlationId,
        successMessage: null,
        errors: [
          {
            errorCode: "webhook-invalid-url",
            errorMessage: "Geçerli bir url girilmelidir.",
          },
        ],
        body: null,
      });
    }

    // İşlem: yeni anahtar üretimi, kaydı, vs.
    const publicKey = await notificationService.rotateWebhookKey(url);

    return res.sendResponse({
      status: 200,
      spanIds,
      correlationId,
      successMessage: "Webhook URL başarıyla ayarlandı.",
      body: { publicKey },
    });
  } catch (err) {
    return res.sendResponse({
      status: 500,
      spanIds,
      correlationId,
      successMessage: null,
      errors: [
        {
          errorCode: "webhook-save-failed",
          errorMessage: err.message || "Sunucu hatası",
        },
      ],
      body: null
    });
  }
};
