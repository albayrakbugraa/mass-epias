const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const forge = require("node-forge");
const notificationsService = require("../services/notificationsService");

function generateTracing(req, label = "MassRead-Notifications") {
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

// RSA anahtar çifti oluşturucu fonksiyon
async function generateKeyPair() {
  return new Promise((resolve, reject) => {
    forge.pki.rsa.generateKeyPair(
      { bits: 2048, workers: 2 },
      (err, keypair) => {
        if (err) reject(err);
        else resolve(keypair);
      }
    );
  });
}

// 7.14 PUT /notifications/webhook
exports.setWebhook = async (req, res) => {
  const tracing = generateTracing(req);
  const { requestId, ...safeTracing } = tracing;
  const event = "PUT /notifications/webhook";
  const { url } = req.body;

  logger.info(
    "Webhook ayarlama isteği alındı",
    logContext(event, tracing, { url })
  );

  // Validation
  if (!url || typeof url !== "string" || !/^https?:\/\/.+/i.test(url)) {
    logger.warn("Eksik veya geçersiz URL", logContext(event, tracing));
    return res.sendResponse({
      status: 422,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)validation-422",
          errorMessage: "Geçerli bir 'url' parametresi zorunludur.",
        },
      ],
    });
  }

  try {
    // RSA anahtar çifti oluştur
    const keypair = await generateKeyPair();
    const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
    const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);

    // Payload'ı oluştur
    const payload = JSON.stringify({
      url,
      publicKey: publicKeyPem,
    });

    // X-Signature hesapla
    const md = forge.md.sha256.create();
    md.update(payload, "utf8");
    const signature = forge.util.encode64(keypair.privateKey.sign(md));

    // MassDbSrvc'ye yeni webhook URL ve public key kaydı gönder
    await notificationsService.updateWebhook(
      {
        url,
        publicKey: publicKeyPem,
        privateKey: privateKeyPem,
        headers: {
          "X-Signature": signature,
        },
      },
      tracing
    );

    logger.info(
      "Webhook URL ve anahtar başarıyla kaydedildi",
      logContext(event, tracing, { url })
    );

    return res.sendResponse({
      status: 200,
      ...safeTracing,
      successMessage: "Webhook URL başarıyla ayarlandı.",
      body: {
        publicKey: publicKeyPem,
      },
    });
  } catch (err) {
    const statusCode = err.response?.status || 500;
    const errorMsg =
      err.response?.data?.errors?.[0]?.errorMessage ||
      err.message ||
      "Bilinmeyen hata";

    logger.error("Webhook ayarlanırken hata oluştu", {
      ...tracing,
      url,
      errorMessage: errorMsg,
      status: statusCode,
      response: err.response?.data,
    });

    return res.sendResponse({
      status: statusCode,
      ...safeTracing,
      errors: [
        {
          errorCode: `(MassRead)webhook-error-${statusCode}`,
          errorMessage: errorMsg,
        },
      ],
    });
  }
};
