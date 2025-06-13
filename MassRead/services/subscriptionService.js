const db = require('../Libs/db');
const mLib = require('../Libs/Ala00Lib');

// DB Config .env'den çekiliyor
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING
};

/**
 * CCB'den gelen abonelik verisini veritabanına kaydeder/günceller.
 * @param {Object} data 
 */
async function saveSubscription(data) {
    const {
        subscriptionKey,
        installationNumber,
        type,
        tckn,
        vkn,
        startDate
    } = data;

    let connection;

    try {
        connection = await db.getConnSimple(dbConfig);

        await connection.execute(
            `MERGE INTO MASS_SUBSCRIPTIONS D
             USING (SELECT :subscriptionKey AS SUBS_KEY FROM DUAL) S
             ON (D.SUBSCRIPTION_KEY = S.SUBS_KEY)
             WHEN MATCHED THEN
                 UPDATE SET LAST_CHECK_DATE = SYSTIMESTAMP, IS_ACTIVE = 1, TYPE = :type
             WHEN NOT MATCHED THEN
                 INSERT (SUBSCRIPTION_KEY, INSTALLATION_NUMBER, TYPE, TCKN, VKN, START_DATE, CREATED_AT, IS_ACTIVE)
                 VALUES (:subscriptionKey, :installationNumber, :type, :tckn, :vkn, TO_TIMESTAMP_TZ(:startDate, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'), SYSTIMESTAMP, 1)`,
            {
                subscriptionKey,
                installationNumber,
                type,
                tckn,
                vkn,
                startDate
            },
            { autoCommit: true }
        );

        mLib.log(`[DB] Abonelik kaydı güncellendi. SUBS_KEY: ${subscriptionKey}`);
    } catch (err) {
        mLib.error(`[DB] Abonelik verisi kaydedilirken hata: ${err.message}`);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (closeErr) {
                mLib.error(`[DB] Bağlantı kapatılırken hata: ${closeErr.message}`);
            }
        }
    }
}

module.exports = {
    saveSubscription
};