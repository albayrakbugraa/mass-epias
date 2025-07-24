const db = require("../db");
const logger = require("../utils/logger");

async function insertWebhookKey({ url, publicKey, privateKey }, tracing = {}) {
  let conn;
  const {
    correlationId = "N/A",
    requestId = "N/A",
    spanIds = "N/A",
    event = "[DB] INSERT /notifications/webhook",
  } = tracing;

  try {
    conn = await db.getConnection();

    // 1. Tüm aktif kayıtları pasif yap (geçerlilik süresi 5 dk daha açık bırakılıyor)
    const updateResult = await conn.execute(
      `UPDATE MASS_WEBHOOK_KEYS 
       SET IS_ACTIVE = 0, EXPIRES_AT = SYSTIMESTAMP + INTERVAL '5' MINUTE 
       WHERE IS_ACTIVE = 1`
    );

    logger.info("[DB] Aktif webhook kayıtları pasife alındı", {
      ...tracing,
      url,
      updatedRows: updateResult.rowsAffected,
    });

    // 2. Yeni kayıt ekle
    await conn.execute(
      `INSERT INTO MASS_WEBHOOK_KEYS 
       (WEBHOOK_URL, PUBLIC_KEY, PRIVATE_KEY, IS_ACTIVE, CREATED_AT) 
       VALUES (:url, :publicKey, :privateKey, 1, SYSTIMESTAMP)`,
      { url, publicKey, privateKey }
    );

    await conn.commit();

    logger.info("[DB] Yeni webhook anahtarı veritabanına eklendi", {
      ...tracing,
      url,
    });
  } catch (err) {
    logger.error("[DB] Webhook DB kaydı sırasında hata oluştu", {
      ...tracing,
      url,
      errorMessage: err.message,
      stack: err.stack,
    });
    throw err;
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (closeErr) {
        logger.error("[DB] Veritabanı bağlantısı kapatılırken hata", {
          ...tracing,
          event: "[DB] CLOSE",
          url,
          errorMessage: closeErr.message,
          stack: err.stack,
        });
      }
    }
  }
}

module.exports = {
  insertWebhookKey,
};
