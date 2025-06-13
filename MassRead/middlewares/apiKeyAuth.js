const db = require('../Libs/db');
const mLib = require('../Libs/Ala00Lib');
const { hashData } = require('../utils/hashUtil');
const { v4: uuidv4 } = require('uuid');

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
                errorCode: '(EDAS)auth-401',
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
                    errorCode: '(EDAS)auth-403',
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
                    errorCode: '(EDAS)auth-403',
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
                errorCode: '(EDAS)db-auth-error-500',
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