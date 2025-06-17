const mLib = require("../Libs/Ala00Lib");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

async function getVersions(req, res) {
  const supportedVersions = ["v1"];
  const spanId = "(MassRead)" + uuidv4();

  try {

    logger.info("[GET /versions] Versiyon bilgisi döndürülüyor.", { correlationId });

    res.sendResponse({
      status: 200, // Sadece numeric code ver, middleware otomatik açıklama ekler
      spanIds: spanId,
      body: supportedVersions,
    });
  } catch (err) {
    
    logger.error("[GET /versions] Hata oluştu.", {
      correlationId,
      errorMessage: err.message,
    });

    res.sendResponse({
      status: 500,
      spanIds: "(edas-massread-service)-get-versions-error",
      errors: [
        {
          errorCode: "(EDAS)server-internal-error",
          errorMessage: "Dahili sunucu hatası oluştu.",
        },
      ],
    });
  }
}

module.exports = {
  getVersions,
};
