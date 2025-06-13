const { sendNotificationToEpias } = require("../services/notificationSender");

/**
 * Planlı veya plansız kesinti bildirimi gönderir.
 * POST /api/v1/notifications/outage-notification
 * Body: {
 *   timestamp, type, subscriptionKey, content
 * }
 */
exports.sendOutageNotification = async (req, res) => {
  // validasyon da eklenebilir
  const outageBody = req.body;
  const correlationId = req.headers["x-correlation-id"] || "";
  const spanIds = "(mass-notify)" + uuidv4();

  // (örnek)
  if (
    !outageBody ||
    !outageBody.timestamp ||
    outageBody.type !== "outage" || // değişebilir
    !outageBody.subscriptionKey ||
    !outageBody.content ||
    typeof outageBody.content !== "object"
  ) {
    return res.sendResponse({
      status: 422,
      spanIds: spanIds,
      correlationId,
      successMessage: null,
      errors: [
        {
          errorCode: "invalid-notification-body",
          errorMessage: "Bildirimin şeması eksik veya hatalı.",
        },
      ],
      body: null,
    });
  }

  // Gönderim
  const result = await sendNotificationToEpias(outageBody);

  if (result.success) {
    res.sendResponse({
      status: 200,
      spanIds: "outage-notification-sent",
      correlationId,
      successMessage:
        "Kesinti bildirimi EPİAŞ webhookuna başarıyla gönderildi.",
      errors: null,
      body: result.data,
    });
  } else {
    res.sendResponse({
      status: result.status || 500,
      spanIds: spanIds,
      correlationId,
      successMessage: null,
      errors: [
        {
          errorCode: "outage-notification-send-failed",
          errorMessage:
            typeof result.error === "string"
              ? result.error
              : JSON.stringify(result.error),
        },
      ],
      body: null,
    });
  }
};
