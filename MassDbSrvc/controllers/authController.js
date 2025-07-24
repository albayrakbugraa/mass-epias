const { hashData } = require("../utils/hashUtil");
const db = require("../db");
const logger = require("../utils/logger");

exports.validateApiKey = async (req, res) => {
  const { token } = req.body;
  const correlationId = req.headers["x-correlation-id"] || "-";

  logger.info(
    `[AUTH][MassDbSrvc] Doğrulama isteği alındı. CID: ${correlationId}`
  );

  if (!token) {
    logger.warn(`[AUTH][MassDbSrvc] Token eksik. CID: ${correlationId}`);
    return res
      .status(400)
      .json({ valid: false, error: "Token zorunlu", correlationId });
  }
  const hashedKey = hashData(token);

  let conn;
  try {
    conn = await db.getConnection();
    logger.info(
      `[AUTH][MassDbSrvc] DB sorgusu başlıyor. CID: ${correlationId}`
    );
    const result = await conn.execute(
      `SELECT API_KEY_ID, IS_ACTIVE FROM MASS_API_KEYS WHERE HASHED_API_KEY = :hashedKey`,
      { hashedKey }
    );
    const record = result.rows?.[0];
    if (!record) {
      logger.warn(
        `[AUTH][MassDbSrvc] API Key bulunamadı. CID: ${correlationId}`
      );
      return res.json({ valid: false, correlationId });
    }
    if (record.IS_ACTIVE === 0) {
      logger.warn(`[AUTH][MassDbSrvc] API Key pasif. CID: ${correlationId}`);
      return res.json({ valid: false, correlationId });
    }
    await conn.execute(
      `UPDATE MASS_API_KEYS SET LAST_USED_DATE = SYSTIMESTAMP WHERE API_KEY_ID = :id`,
      { id: record.API_KEY_ID },
      { autoCommit: true }
    );
    logger.info(`[AUTH][MassDbSrvc] API Key geçerli. CID: ${correlationId}`);
    return res.json({ valid: true, correlationId });
  } catch (err) {
    logger.error(
      `[AUTH][MassDbSrvc] DB hatası. CID: ${correlationId}, ERROR: ${err.message}`
    );
    return res
      .status(500)
      .json({ valid: false, error: err.message, correlationId });
  } finally {
    if (conn) await conn.close();
  }
};
