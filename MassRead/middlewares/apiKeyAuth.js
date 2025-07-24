/*
const db = require('../Libs/db');
const mLib = require('../Libs/Ala00Lib');
const { hashData } = require('../utils/hashUtil');
const { v4: uuidv4 } = require('uuid');
*/

const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const { hashData } = require("../utils/hashUtil");

const MASS_DB_SRVC_URL = process.env.MASS_DB_SRVC_URL;

/*
module.exports = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const correlationId = req.headers['x-correlation-id'] || uuidv4();

    mLib.log(`[AUTH] Doğrulama başlatıldı. CID: ${correlationId}`);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        mLib.warn(`[AUTH] Eksik veya hatalı Authorization header. CID: ${correlationId}`);
        return res.status(401).json({
            status: 401,
            correlationId,
            errors: [{
                errorCode: '(MassRead)auth-401',
                errorMessage: 'Authorization header eksik veya geçersiz'
            }]
        });
    }

    const token = authHeader.split(' ')[1];
    const hashedKey = hashData(token);
    mLib.log(`[AUTH] API Key hash'lendi. CID: ${correlationId}`);

    let connection;
    try {
        connection = await db.getConnSimple({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: process.env.DB_CONNECT_STRING
        });

        const result = await connection.execute(
            `SELECT API_KEY_ID, IS_ACTIVE FROM MASS_API_KEYS WHERE HASHED_API_KEY = :hashedKey`,
            { hashedKey }
        );
        const record = result.rows[0];

        if (!record) {
            mLib.warn(`[AUTH] API Key bulunamadı. CID: ${correlationId}`);
            return res.status(403).json({
                status: 403,
                correlationId,
                errors: [{
                    errorCode: '(MassRead)auth-403',
                    errorMessage: 'API Key geçersiz'
                }]
            });
        }

        if (record.IS_ACTIVE === 0) {
            mLib.warn(`[AUTH] API Key pasif durumda. CID: ${correlationId}`);
            return res.status(403).json({
                status: 403,
                correlationId,
                errors: [{
                    errorCode: '(MassRead)auth-403',
                    errorMessage: 'API Key pasif'
                }]
            });
        }

        await connection.execute(
            `UPDATE MASS_API_KEYS SET LAST_USED_DATE = SYSTIMESTAMP WHERE API_KEY_ID = :id`,
            { id: record.API_KEY_ID }
        );

        mLib.log(`[AUTH] API Key doğrulandı. CID: ${correlationId}, API_KEY_ID: ${record.API_KEY_ID}`);
        next();
    } catch (err) {
        mLib.error(`[AUTH] DB hatası: ${err.message}. CID: ${correlationId}`);
        return res.status(500).json({
            status: 500,
            correlationId,
            errors: [{
                errorCode: '(MassRead)db-auth-error-500',
                errorMessage: 'DB hatası'
            }]
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (closeErr) {
                mLib.error(`[AUTH] DB bağlantı kapatma hatası: ${closeErr.message}. CID: ${correlationId}`);
            }
        }
    }
};
*/

module.exports = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const correlationId = req.headers["x-correlation-id"] || uuidv4();

  logger.info(`[AUTH] Doğrulama başladı. CID: ${correlationId}`);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn(
      `[AUTH] Eksik veya hatalı Authorization header. CID: ${correlationId}`
    );
    return res.status(401).json({
      status: 401,
      correlationId,
      errors: [
        {
          errorCode: "(MassRead)auth-401",
          errorMessage: "Authorization header eksik veya geçersiz",
        },
      ],
    });
  }

  const token = authHeader.split(" ")[1];
  logger.info("[AUTH] Token alındı", {
    correlationId,
    tokenSample: token?.slice(0, 6) + "...",
  });

  try {
    logger.info("[AUTH] MassDbSrvc'ye API key doğrulama isteği gönderiliyor", {
      correlationId,
      endpoint: `${MASS_DB_SRVC_URL}/auth/validate`,
    });
    const resp = await axios.post(
      `${MASS_DB_SRVC_URL}/auth/validate`,
      { token },
      {
        headers: { "x-correlation-id": correlationId },
      }
    );

    if (resp.data && resp.data.valid) {
      logger.info(`[AUTH] API Key doğrulandı. CID: ${correlationId}`);
      next();
    } else {
      logger.warn(`[AUTH] API Key geçersiz/pasif. CID: ${correlationId}`);
      return res.status(403).json({
        status: 403,
        correlationId,
        errors: [
          {
            errorCode: "(MassRead)auth-403",
            errorMessage: "API Key geçersiz veya pasif",
          },
        ],
      });
    }
  } catch (err) {
    logger.error("[AUTH] Doğrulama sırasında hata", {
      correlationId,
      errorMessage: err.message,
      stack: err.stack,
      response: err.response?.data,
      status: err.response?.status,
    });
    return res.status(err.response?.status || 500).json({
      status: err.response?.status || 500,
      correlationId,
      errors: [
        {
          errorCode: "(MassRead)auth-error",
          errorMessage: err.response?.data?.error || err.message,
        },
      ],
    });
  }
};
