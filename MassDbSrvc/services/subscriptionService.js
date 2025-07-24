const db = require("../db/index");
const logger = require("../utils/logger");

const dwhDblink = process.env.DB_DWH_DBLINK; // DWH için
const ccbDblink = process.env.DB_CCB_DBLINK; // CCB için
const arilDblink = process.env.DB_ARIL_DBLINK; // ARIL için
const companyName = process.env.REGION || "xedas";



// GET /subscription/:subscriptionKey/reported-outages
async function getReportedOutages(data, tracing = {}) {
  const { subscriptionKey, start, end } = data;
  const {
    correlationId = "N/A",
    requestId = "N/A",
    spanIds = "N/A",
    event = "[DB] GET /subscription/reported-outages",
  } = tracing;

  let conn;
  try {
    conn = await db.getConnection();

    // 1. Önce SP_ID ve SA_ID'yi bul
    const subInfo = await resolveSubscriptionInfo(
      conn,
      subscriptionKey,
      tracing
    );
    if (!subInfo) {
      logger.error("[DB] Abonelik bilgisi bulunamadı", {
        event,
        correlationId,
        requestId,
        spanIds,
        subscriptionKey,
      });
      throw new Error("Abonelik bilgisi bulunamadı!");
    }

    const spId = subInfo.INSTALLATIONNUMBER;
    // const saId = subInfo.HESAPANLASMASI; // Gerekirse

    // 2. Yıl bilgisini belirle (başlangıç yılından bir yıl öncesi dahil)
    const yearStart = new Date(start).getFullYear() - 1;

    // 3. Tazminat ve kesinti bilgilerini çek
    const yearly = await fetchYearlyCompensation(conn, spId, yearStart);

    // 4. Uzun süreli tazminat compensation ve OUTAGE_NO listesini çek
    const { compensationCount, compensations, outageCodes } =
      await fetchLongOutagesCompensation(conn, spId, yearStart);

    // 5. OUTAGE_NO'lar ile detayları bulk çek (kod listesi boşsa boş array döner)
    const outages = await fetchOutageDetailsByCodes(
      conn,
      outageCodes,
      start,
      end
    );

    const response = {
      company: yearly.company || companyName,
      code: yearly.code || spId,
      region: yearly.region || "urban",
      tkDuration: yearly.tkDuration || "",
      tkNumber: yearly.tkNumber || "",
      yearlyCompensationRequired: !!yearly.yearlyCompensationRequired,
      compensationCount: compensationCount || 0,
      compensations: compensations || [],
      outages: outages || [],
    };

    logger.info("[DB] Kesinti ve tazminat bilgileri veritabanından çekildi.", {
      event,
      correlationId,
      requestId,
      spanIds,
      subscriptionKey,
      responseSummary: {
        compensationCount: response.compensationCount,
        outageCount: response.outages.length,
      },
    });

    return response;
  } catch (err) {
    logger.error(
      "Kesinti ve tazminat bilgileri veritabanından çekilirken hata.",
      {
        ...tracing,
        subscriptionKey,
        errorMessage: err.message,
        stack: err.stack,
      }
    );
    throw err;
  } finally {
    if (conn) {
      try {
        await conn.close();
        logger.info("[DB] DB bağlantısı kapatıldı", {
          ...tracing,
          subscriptionKey,
        });
      } catch (closeErr) {
        logger.error("[DB] Veritabanı bağlantısı kapatılırken hata", {
          ...tracing,
          event: "DB CLOSE",
          subscriptionKey,
          errorMessage: closeErr.message,
        });
      }
    }
  }
}

// Yıllık kesinti tazminatı sorgusu
// --- ORDER BY YIL DESC FETCH FIRST 1 ROW ONLY;
async function fetchYearlyCompensation(conn, spId, yearStart) {
  logger.info("[DB] Yıllık tazminat sorgusu başlıyor", {
    spId,
    yearStart,
    dwhDblink,
  });
  const result = await conn.execute(
    `
        SELECT
            'xedas' AS company,
            SP_ID AS code,
            IMAR_ALANI_TIPI AS region,
            TSKSURE_BILDIRIMSIZ AS tkDuration,
            TSKSAYI_BILDIRIMSIZ AS tkNumber,
            CASE WHEN TAZMINAT_ALIR ='1' THEN 1 ELSE 0 END AS yearlyCompensationRequired
        FROM BAW_SCADA.TMP_OUTAGE_D_2150@${dwhDblink}
        WHERE SP_ID = :spId AND YIL >= :yearStart
    `,
    { spId, yearStart },
    { outFormat: db.oracledb.OUT_FORMAT_OBJECT }
  );
  logger.info("[DB] Yıllık tazminat sorgusu tamamlandı", {
    found: result.rows.length,
  });
  return result.rows[0] || {};
}

// -- Uzun süreli kesinti tazminatı ve OUTAGE_NO listesi (bulk)
async function fetchLongOutagesCompensation(conn, spId, yearStart) {
  logger.info("[DB] Uzun süreli tazminat sorgusu başlıyor", {
    spId,
    yearStart,
    dwhDblink,
  });
  const result = await conn.execute(
    `
    SELECT
        OUTAGE_NO,
        TAZMINAT AS amount,
        'TRY' AS currency
    FROM BAW_SCADA.TMP_OUTAGE_D_9008@${dwhDblink}
    WHERE SP_ID = :spId
      AND TAZMINAT > 0
      AND YIL >= :yearStart
    `,
    { spId, yearStart },
    { outFormat: db.oracledb.OUT_FORMAT_OBJECT }
  );
  logger.info("[DB] Uzun süreli tazminat sorgusu tamamlandı", {
    count: result.rows.length,
  });

  const outageCodes = [];
  const compensations = (result.rows || []).map((row) => {
    outageCodes.push(row.OUTAGE_NO);
    return {
      amount: Number(row.AMOUNT),
      currency: row.CURRENCY,
      status: "outstanding",
      code: row.OUTAGE_NO,
    };
  });

  return {
    compensationCount: compensations.length,
    compensations,
    outageCodes,
  };
}

// -- OUTAGE_NO listesi ile bulk kesinti detayları sorgusu
async function fetchOutageDetailsByCodes(conn, codeList, start, end) {
  logger.info("[DB] Outage detay sorgusu başlıyor", {
    codeList,
    start,
    end,
    dwhDblink,
  });

  if (!codeList || codeList.length === 0) return [];

  // Oracle'da dinamik IN bind parametreleri:
  const inParams = codeList.map((_, i) => `:code${i}`).join(", ");
  const binds = {};
  codeList.forEach((code, i) => {
    binds[`code${i}`] = code;
  });
  binds.start = start;
  binds.end = end;

  const result = await conn.execute(
    `
    SELECT
        COLUMN0 AS code,
        COLUMN1 AS stage,
        COLUMN8 AS description,
        COLUMN2 AS city,
        COLUMN3 AS district,
        SEBEKE_UNSURU_TIPI AS networkType,
        COLUMN4 AS networkCode,
        COLUMN5 AS source,
        COLUMN12 AS durationType,
        COLUMN7 AS cause,
        COLUMN9 AS notification,
        COLUMN10 AS start_time,
        COLUMN11 AS end_time,
        (KE_AG_AD + KE_OG_AD) AS urban,
        (KA_AG_AD + KA_OG_AD) AS suburban,
        (KI_AG_AD + KI_OG_AD) AS rural,
        (KE_AG_AD + KA_AG_AD + KI_AG_AD) AS lowVoltage,
        (KE_OG_AD + KA_OG_AD + KI_OG_AD) AS mediumVoltage
    FROM BAW_SCADA.TMP_OUTAGE_1562@${dwhDblink}
    WHERE COLUMN0 IN (${inParams})
      AND COLUMN10 >= :start
      AND COLUMN11 <= :end
    `,
    binds,
    { outFormat: db.oracledb.OUT_FORMAT_OBJECT }
  );
  logger.info("[DB] Outage detay sorgusu tamamlandı", {
    count: result.rows.length,
  });

  return (result.rows || []).map((row) => ({
    code: row.CODE,
    stage: row.STAGE,
    description: { tr: row.DESCRIPTION, en: row.DESCRIPTION },
    location: {
      city: row.CITY,
      district: row.DISTRICT,
      networkType: row.NETWORKTYPE,
      networkCode: row.NETWORKCODE,
    },
    class: {
      source: row.SOURCE,
      duration: row.DURATIONTYPE,
      cause: row.CAUSE,
      notification: row.NOTIFICATION,
    },
    duration: {
      start: row.START_TIME,
      end: row.END_TIME,
    },
    affected: {
      urban: {
        lowVoltage: row.LOWVOLTAGE || 0,
        mediumVoltage: row.LOWVOLTAGE || 0,
      },
      suburban: {
        lowVoltage: row.SUBURBAN || 0,
        mediumVoltage: row.SUBURBAN || 0,
      },
      rural: {
        lowVoltage: row.RURAL || 0,
        mediumVoltage: row.RURAL || 0,
      },
    },
  }));
}

// Helper: subscriptionKey'den SP_ID ve SA_ID
async function resolveSubscriptionInfo(conn, subscriptionKey, tracing = {}) {
  const {
    correlationId = "N/A",
    requestId = "N/A",
    spanIds = "N/A",
    event = "DB SELECT /subscription/resolve-info",
  } = tracing;

  try {
    logger.info("[DB] subscriptionKey ile SP_ID ve SA_ID aranıyor", {
      event,
      correlationId,
      requestId,
      spanIds,
      subscriptionKey,
      ccbDblink,
    });

    const result = await conn.execute(
      `
        SELECT 
          SASP.SP_ID AS installationNumber,
          SA.SA_ID AS hesapAnlasmasi
        FROM 
          CISADM.CI_SA@${ccbDblink} SA
          INNER JOIN CISADM.CI_SA_SP@${ccbDblink} SASP ON SA.SA_ID = SASP.SA_ID
        WHERE 
          SA.OLD_ACCT_ID = :subscriptionKey
      `,
      { subscriptionKey },
      { outFormat: db.oracledb.OUT_FORMAT_OBJECT }
    );

    logger.info("[DB] subscriptionKey ile SP_ID ve SA_ID arama tamamlandı", {
      event,
      correlationId,
      requestId,
      spanIds,
      subscriptionKey,
      found: result.rows.length > 0,
    });

    return result.rows[0];
  } catch (err) {
    logger.error(
      "[DB] subscriptionKey ile SP_ID ve SA_ID arama sırasında hata oluştu",
      {
        event,
        correlationId,
        requestId,
        spanIds,
        subscriptionKey,
        errorMessage: err.message,
        stack: err.stack,
      }
    );
    throw err;
  }
}

// Abonelik ekleme/güncelleme (MERGE)
async function saveSubscription(data, tracing = {}) {
  const { subscriptionKey, installationNumber, type, tckn, vkn, startDate } =
    data;
  const {
    correlationId = "N/A",
    requestId = "N/A",
    spanIds = "N/A",
    event = "[DB] MERGE /subscription/check",
  } = tracing;

  let conn;
  try {
    conn = await db.getConnection();

    await conn.execute(
      `MERGE INTO MASS_SUBSCRIPTIONS D
       USING (SELECT :subscriptionKey AS SUBS_KEY FROM DUAL) S
       ON (D.SUBSCRIPTION_KEY = S.SUBS_KEY)
       WHEN MATCHED THEN
           UPDATE SET LAST_CHECK_DATE = SYSTIMESTAMP, IS_ACTIVE = 1, TYPE = :type
       WHEN NOT MATCHED THEN
           INSERT (SUBSCRIPTION_KEY, INSTALLATION_NUMBER, TYPE, TCKN, VKN, START_DATE, CREATED_AT, IS_ACTIVE)
           VALUES (:subscriptionKey, :installationNumber, :type, :tckn, :vkn, TO_TIMESTAMP_TZ(:startDate, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'), SYSTIMESTAMP, 1)`,
      { subscriptionKey, installationNumber, type, tckn, vkn, startDate },
      { autoCommit: true }
    );

    logger.info("[DB] abonelik kaydı güncellendi", {
      ...tracing,
      subscriptionKey,
    });
  } catch (err) {
    logger.error("[DB] Veritabanı: abonelik kaydedilirken hata", {
      ...tracing,
      subscriptionKey,
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
          subscriptionKey,
          errorMessage: err.message,
          stack: err.stack,
        });
      }
    }
  }
}

// Abonelik detaylarını kaydet/güncelle (MERGE)
async function saveSubscriptionDetails(data, tracing = {}) {
  const {
    subscriptionKey,
    address,
    etsoCode,
    contractAccountNumber,
    unexpectedUsageThreshold,
    usageLimitThreshold,
    consumerGroup,
    consumerClass,
  } = data;

  const {
    correlationId = "N/A",
    requestId = "N/A",
    spanIds = "N/A",
    event = "[DB] MERGE /subscription/details",
  } = tracing;

  let conn;
  try {
    conn = await db.getConnection();

    await conn.execute(
      `MERGE INTO MASS_SUBSCRIPTION_DETAILS target
       USING (SELECT :subscriptionKey AS SUBS_KEY FROM DUAL) src
       ON (target.SUBSCRIPTION_KEY = src.SUBS_KEY)
       WHEN MATCHED THEN
         UPDATE SET 
           ADDRESS = :address,
           ETSO_CODE = :etsoCode,
           CONTRACT_ACCOUNT_NUMBER = :contractAccountNumber,
           UNEXPECTED_USAGE_THRESHOLD = :unexpectedUsageThreshold,
           USAGE_LIMIT_THRESHOLD = :usageLimitThreshold,
           CONSUMER_GROUP = :consumerGroup,
           CONSUMER_CLASS = :consumerClass,
           UPDATED_AT = SYSTIMESTAMP
       WHEN NOT MATCHED THEN
         INSERT (
           SUBSCRIPTION_KEY, ADDRESS, ETSO_CODE, CONTRACT_ACCOUNT_NUMBER,
           UNEXPECTED_USAGE_THRESHOLD, USAGE_LIMIT_THRESHOLD,
           CONSUMER_GROUP, CONSUMER_CLASS, CREATED_AT
         )
         VALUES (
           :subscriptionKey, :address, :etsoCode, :contractAccountNumber,
           :unexpectedUsageThreshold, :usageLimitThreshold,
           :consumerGroup, :consumerClass, SYSTIMESTAMP
         )`,
      {
        subscriptionKey,
        address,
        etsoCode,
        contractAccountNumber,
        unexpectedUsageThreshold,
        usageLimitThreshold,
        consumerGroup,
        consumerClass,
      },
      { autoCommit: true }
    );

    logger.info("[DB] abonelik detayları güncellendi", {
      ...tracing,
      subscriptionKey,
    });
  } catch (err) {
    logger.error("[DB] detay güncellenirken hata", {
      ...tracing,
      subscriptionKey,
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
          subscriptionKey,
          errorMessage: err.message,
          stack: err.stack,
          response: err.response?.data,
          status: err.response?.status,
        });
      }
    }
  }
}

// Abonelik pasife çekme
async function deactivateSubscription(subscriptionKey, tracing = {}) {
  const {
    correlationId = "N/A",
    requestId = "N/A",
    spanIds = "N/A",
    event = "[DB] UPDATE /subscription/deactivate",
  } = tracing;

  let conn;
  try {
    conn = await db.getConnection();

    await conn.execute(
      `UPDATE MASS_SUBSCRIPTIONS
         SET IS_ACTIVE = 0,
             UPDATED_AT = SYSTIMESTAMP
       WHERE SUBSCRIPTION_KEY = :subscriptionKey`,
      { subscriptionKey },
      { autoCommit: true }
    );

    logger.info("[DB] abonelik pasife çekildi", {
      ...tracing,
      subscriptionKey,
    });
  } catch (err) {
    logger.error("[DB] Veritabanı: abonelik pasifleştirme hatası", {
      ...tracing,
      subscriptionKey,
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
          subscriptionKey,
          errorMessage: err.message,
          stack: err.stack,
          response: err.response?.data,
          status: err.response?.status,
        });
      }
    }
  }
}
// Tüketim Limiti Güncelleme
async function updateUsageLimitThreshold(
  subscriptionKey,
  threshold,
  tracing = {}
) {
  const {
    correlationId = "N/A",
    requestId = "N/A",
    spanIds = "N/A",
    event = "[DB] UPDATE /subscription/usage-limit-threshold",
  } = tracing;

  let conn;
  try {
    conn = await db.getConnection();

    await connection.execute(
      `UPDATE MASS_SUBSCRIPTION_DETAILS SET USAGE_LIMIT_THRESHOLD = :threshold, UPDATED_AT = SYSTIMESTAMP WHERE SUBSCRIPTION_KEY = :subscriptionKey`,
      { threshold, subscriptionKey }
    );

    logger.info("[DB] Tüketim Limiti veritabanında güncellendi.", {
      ...tracing,
      subscriptionKey,
      threshold,
    });
  } catch (err) {
    logger.error("[DB] Tüketim Limiti veritabanında güncellenirken hata", {
      ...tracing,
      subscriptionKey,
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
          subscriptionKey,
          errorMessage: closeErr.message,
        });
      }
    }
  }
}

// Aşırı Tüketim Eşiği Güncelleme
async function updateUnexpectedUsageThreshold(
  subscriptionKey,
  threshold,
  tracing = {}
) {
  const {
    correlationId = "N/A",
    requestId = "N/A",
    spanIds = "N/A",
    event = "[DB] UPDATE /subscription/unexpected-usage-threshold",
  } = tracing;

  let conn;
  try {
    conn = await db.getConnection();

    await connection.execute(
      `UPDATE MASS_SUBSCRIPTION_DETAILS SET UNEXPECTED_USAGE_THRESHOLD = :threshold, UPDATED_AT = SYSTIMESTAMP WHERE SUBSCRIPTION_KEY = :subscriptionKey`,
      { threshold, subscriptionKey }
    );

    logger.info("[DB] Aşırı Tüketim Eşiği Güncellendi.", {
      subscriptionKey,
      ...tracing,
      threshold,
    });
  } catch (err) {
    logger.error("[DB] Aşırı Tüketim Eşiği Güncellenirken Hata", {
      ...tracing,
      subscriptionKey,
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
          subscriptionKey,
          errorMessage: closeErr.message,
        });
      }
    }
  }
}

module.exports = {
  saveSubscription,
  saveSubscriptionDetails,
  deactivateSubscription,
  getReportedOutages,
  updateUnexpectedUsageThreshold,
  updateUsageLimitThreshold,
};
