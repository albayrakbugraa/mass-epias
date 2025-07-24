const db = require("../db");
const logger = require("../utils/logger");

// Şikayet kaydet
async function saveComplaint({
  complaintId,
  category,
  subCategory,
  content,
  subscriptionKey,
}) {
  let conn;
  try {
    conn = await db.getConnection();
    await conn.execute(
      `INSERT INTO MASS_COMPLAINTS (
        COMPLAINT_ID, SUBSCRIPTION_KEY, CATEGORY, SUB_CATEGORY, CONTENT, STATUS, CREATED_AT
      ) VALUES (
        :complaintId, :subscriptionKey, :category, :subCategory, :content, 'inReview', SYSTIMESTAMP
      )`,
      { complaintId, subscriptionKey, category, subCategory, content },
      { autoCommit: true }
    );
    logger.info("[DB] Şikayet başarıyla kaydedildi", { complaintId });
  } catch (err) {
    logger.error("[DB] Şikayet kaydedilirken hata", {
      complaintId,
      errorMessage: err.message,
    });
    throw err;
  } finally {
    if (conn) await conn.close();
  }
}

// Dosya URL'leriyle şikayet eşle
async function linkFilesByDownloadUrl(complaintId, urlList) {
  if (!Array.isArray(urlList)) throw new Error("urlList bir array olmalı!");
  let conn;
  try {
    conn = await db.getConnection();
    for (const url of urlList) {
      await conn.execute(
        `UPDATE MASS_COMPLAINT_FILES
         SET COMPLAINT_ID = :complaintId, UPDATED_AT = SYSTIMESTAMP
         WHERE DOWNLOAD_URL = :url`,
        { complaintId, url },
        { autoCommit: true }
      );
    }
    logger.info("[DB] Dosya-şikayet eşlemesi tamamlandı", {
      complaintId,
      count: urlList.length,
    });
  } catch (err) {
    logger.error("[DB] Dosya-şikayet eşlemesinde hata", {
      complaintId,
      errorMessage: err.message,
    });
    throw err;
  } finally {
    if (conn) await conn.close();
  }
}

// Şikayet detayını getir
async function getComplaint(complaintId) {
  let conn;
  try {
    conn = await db.getConnection();
    const result = await conn.execute(
      `SELECT CATEGORY, SUB_CATEGORY, CONTENT, STATUS
       FROM MASS_COMPLAINTS
       WHERE COMPLAINT_ID = :complaintId AND IS_ACTIVE = 1`,
      { complaintId },
      { outFormat: db.oracledb.OUT_FORMAT_OBJECT }
    );
    logger.info("[DB] Şikayet detayı getirildi", { complaintId });
    return result.rows?.[0] || null;
  } catch (err) {
    logger.error("[DB] Şikayet detayı alınırken hata", {
      complaintId,
      errorMessage: err.message,
    });
    throw err;
  } finally {
    if (conn) await conn.close();
  }
}

// Şikayete bağlı dosya URL'lerini getir
async function getFileUrlsByComplaintId(complaintId) {
  let conn;
  try {
    conn = await db.getConnection();
    const result = await conn.execute(
      `SELECT DOWNLOAD_URL
       FROM MASS_COMPLAINT_FILES
       WHERE COMPLAINT_ID = :complaintId AND IS_ACTIVE = 1`,
      { complaintId },
      { outFormat: db.oracledb.OUT_FORMAT_OBJECT }
    );
    logger.info("[DB] Şikayet dosya url'leri getirildi", {
      complaintId,
      count: result.rows.length,
    });
    return result.rows?.map((r) => r.DOWNLOAD_URL) || [];
  } catch (err) {
    logger.error("[DB] Şikayet dosya url'leri alınırken hata", {
      complaintId,
      errorMessage: err.message,
    });
    throw err;
  } finally {
    if (conn) await conn.close();
  }
}

// Şikayet dosyasını kaydet
async function saveComplaintFile({
  fileId,
  name,
  mimeType,
  size,
  uploadUrl,
  downloadUrl,
  uploadExpiresAt,
}) {
  const conn = await db.getConnection();
  try {
    await conn.execute(
      `INSERT INTO MASS_COMPLAINT_FILES (
        FILE_ID, NAME, MIME_TYPE, FILE_SIZE, UPLOAD_URL, DOWNLOAD_URL,
        UPLOAD_EXPIRES_AT, IS_UPLOADED, CREATED_AT
      ) VALUES (
        :fileId, :name, :mimeType, :size, :uploadUrl, :downloadUrl,
        TO_TIMESTAMP_TZ(:uploadExpiresAt, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'),
        0, SYSTIMESTAMP
      )`,
      { fileId, name, mimeType, size, uploadUrl, downloadUrl, uploadExpiresAt },
      { autoCommit: true }
    );
    logger.info("[DB] Şikayet dosyası kaydedildi", { fileId });
  } catch (err) {
    logger.error("[DB] Şikayet dosyası kaydedilemedi", {
      fileId,
      errorMessage: err.message,
    });
    throw err;
  } finally {
    await conn.close();
  }
}

async function getUploadInfo(fileId) {
  const sql = `
    SELECT FILE_ID, NAME, UPLOAD_EXPIRES_AT, IS_UPLOADED
    FROM MASS_COMPLAINT_FILES
    WHERE FILE_ID = :fileId AND IS_ACTIVE = 1`;

  const conn = await db.getConnection();
  try {
    const result = await conn.execute(
      sql,
      { fileId },
      { outFormat: db.oracledb.OUT_FORMAT_OBJECT }
    );
    logger.info("[DB] Dosya upload info getirildi", { fileId });
    return result.rows?.[0] || null;
  } catch (err) {
    logger.error("[DB] Dosya upload info alınırken hata", {
      fileId,
      errorMessage: err.message,
    });
    throw err;
  } finally {
    await conn.close();
  }
}

async function markFileUploaded(fileId) {
  const conn = await db.getConnection();
  try {
    const result = await conn.execute(
      `UPDATE MASS_COMPLAINT_FILES
       SET IS_UPLOADED = 1, UPDATED_AT = SYSTIMESTAMP
       WHERE FILE_ID = :fileId AND IS_UPLOADED = 0`,
      { fileId },
      { autoCommit: true }
    );
    logger.info("[DB] Dosya IS_UPLOADED işaretlendi", { fileId });
    return result.rowsAffected > 0;
  } catch (err) {
    logger.error("[DB] Dosya IS_UPLOADED işaretleme hatası", {
      fileId,
      errorMessage: err.message,
    });
    throw err;
  } finally {
    await conn.close();
  }
}

async function checkFilePhysicallyExists(fileId, fileName) {
  try {
    const resp = await axios.get(
      `${
        process.env.MASS_FILE_URL
      }/file/exists/${fileId}?name=${encodeURIComponent(fileName)}`
    );
    logger.info("[HTTP] MassFile dosya fiziksel kontrol", {
      fileId,
      fileName,
      exists: resp.data.exists,
    });
    return resp.data.exists === true;
  } catch (err) {
    logger.error("[HTTP] MassFile fiziksel dosya kontrol hatası", {
      fileId,
      fileName,
      errorMessage: err.message,
    });
    return false;
  }
}


async function passivateComplaint(complaintId) {
  const conn = await db.getConnection();
  try {
    const result = await conn.execute(
      `UPDATE MASS_COMPLAINTS SET IS_ACTIVE = 0, UPDATED_AT = SYSTIMESTAMP WHERE COMPLAINT_ID = :complaintId AND IS_ACTIVE = 1`,
      { complaintId },
      { autoCommit: true }
    );
    logger.info(`[DB] Şikayet ve dosyaları pasife çekildi: ${complaintId}`);
    return result.rowsAffected > 0;
  } catch (err) {
    logger.error("[DB] Şikayet pasife çekilirken hata", {
      complaintId,
      errorMessage: err.message,
    });
    throw err;
  } finally {
    await conn.close();
  }
}

module.exports = {
  saveComplaint,
  linkFilesByDownloadUrl,
  getComplaint,
  getFileUrlsByComplaintId,
  saveComplaintFile,
  getUploadInfo,
  markFileUploaded,
  checkFilePhysicallyExists,
  passivateComplaint,
};
