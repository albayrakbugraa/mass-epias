const xml2js = require("xml2js");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const https = require("https");
const logger = require("../utils/logger");

const CCB_DEBUG_USER = process.env.CCB_USER || "DEBUGUSER";
const CCB_DEBUG_PASS = process.env.CCB_PASS || "DEBUGUSER00";

const xmlBuilder = new xml2js.Builder({ headless: true });
const xmlParser = new xml2js.Parser({
  explicitArray: false,
  ignoreAttrs: true,
});

const endpointMap = {
  check: process.env.CCB_SUBSCRIPTION_CHECK_URL,
  key: process.env.CCB_SUBSCRIPTION_KEY_URL,
  usageLimit: process.env.CCB_SUBSCRIPTION_USAGE_LIMIT_URL,
  unexpectedUsage: process.env.CCB_SUBSCRIPTION_UNEXPECTED_USAGE_URL,
  delete: process.env.CCB_SUBSCRIPTION_DELETE_URL,
};

async function callCcb(xmlRequest, correlationId, type = "check") {
  const authHeader =
    "Basic " +
    Buffer.from(`${CCB_DEBUG_USER}:${CCB_DEBUG_PASS}`).toString("base64");

  const headers = {
    "Content-Type": "text/xml;charset=UTF-8",
    SOAPAction: "",
    "X-Request-ID": uuidv4(),
    "X-Correlation-ID": correlationId,
    Authorization: authHeader,
  };

  const agent = new https.Agent({ rejectUnauthorized: false });

  

  const url = endpointMap[type];

  if (!url) {
    logger.error("[MassRead CCB Servisi] Endpoint URL eksik", {
      type,
      correlationId,
    });
    throw new Error(
      `'${type}' tipi için geçerli bir endpoint URL tanımlı değil.`
    );
  }

  try {
    logger.info("[MassRead CCB Servisi] SOAP isteği gönderiliyor", {
      correlationId,
      type,
      url,
      requestSample: xmlRequest?.substring(0, 200) + "...",
    });

    const response = await axios.post(url, xmlRequest, {
      headers,
      httpsAgent: agent,
    });

    logger.info("[MassRead CCB Servisi] SOAP yanıtı alındı", {
      correlationId,
      type,
      url,
      status: response.status,
    });
    return response.data;
  } catch (err) {
    logger.error("[MassRead CCB Servisi] SOAP çağrısı başarısız", {
      correlationId,
      type,
      url,
      errorMessage: err.message,
      stack: err.stack,
      response: err.response?.data,
      status: err.response?.status,
    });
    throw err;
  }
}

//7.4 POST /subscription/check
function buildSubscriptionCheckXml({ installationNumber, type, tckn, vkn }) {
  const requestBody = {
    "cms:CMSUBSCHECK": {
      "cms:subscriptionCheckRequest": {
        "cms:vkn": vkn || null,
        "cms:tckn": tckn || null,
        "cms:installationNumber": installationNumber,
        "cms:type": type,
      },
    },
  };

  const innerXml = xmlBuilder.buildObject(requestBody);
  return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cms="http://oracle.com/CMSUBSCHECK.xsd">
        <soapenv:Header/>
        <soapenv:Body>
            ${innerXml}
        </soapenv:Body>
    </soapenv:Envelope>`.trim();
}
async function parseSubscriptionCheckResponse(xml) {
  try {
    const parsed = await xmlParser.parseStringPromise(xml);
    const response =
      parsed?.["soapenv:Envelope"]?.["soapenv:Body"]?.["CMSUBSCHECK"]?.[
        "subscriptionCheckResponse"
      ];

    if (!response) {
      logger.error(
        "[MassRead CCB Servisi] subscriptionCheck yanıtı beklenen formatta değil",
        { rawXmlSample: xml?.substring(0, 500) + "..." }
      );
      throw new Error("CCB subscriptionCheck yanıtı beklenen formatta değil.");
    }

    return {
      valid: response.valid === "true" || response.valid === true,
      subscriptionKey: response.subscriptionKey,
      type: response.type,
      startDate: response.startDate,
      responseCode: response.responseCode
        ? parseInt(response.responseCode, 10)
        : undefined,
    };
  } catch (err) {
    logger.error(
      "[MassRead CCB Servisi] subscriptionCheck yanıtı parse hatası",
      {
        errorMessage: err.message,
        stack: err.stack,
        rawXmlSample: xml?.substring(0, 500) + "...",
      }
    );
    throw err;
  }
}

//7.5 GET /subscription/{subscriptionKey}
function buildSubscriptionKeyQueryXml(subscriptionKey) {
  return `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cms="http://oracle.com/CMSUBSCRKEY.xsd">
      <soapenv:Header/>
      <soapenv:Body>
        <cms:CMSUBSCRKEY dateTimeTagFormat="xsd:strict">
          <cms:subscriptionKeyRequest>
            <cms:subscriptionKey>${subscriptionKey}</cms:subscriptionKey>
          </cms:subscriptionKeyRequest>
        </cms:CMSUBSCRKEY>
      </soapenv:Body>
    </soapenv:Envelope>
  `.trim();
}

async function parseSubscriptionKeyResponse(xml) {
  try {
    const parsed = await xmlParser.parseStringPromise(xml);

    const responseBody =
      parsed?.["soapenv:Envelope"]?.["soapenv:Body"]?.["CMSUBSCRKEY"]?.[
        "subscriptionKeyResponse"
      ];

    if (!responseBody || !responseBody.subscriptionDetails) {
      logger.error(
        "[MassRead CCB Servisi] subscriptionKey yanıtı beklenen formatta değil",
        { rawXmlSample: xml?.substring(0, 500) + "..." }
      );
      throw new Error("CCB response formatı geçersiz.");
    }

    const details = responseBody.subscriptionDetails;
    const notification = responseBody.notificationDetails || {};
    const consumer = responseBody.consumerDetails || {};

    return {
      startDate: details.startDate,
      type: details.type,
      address: details.address,
      installationNumber: details.installationNumber,
      etsoCode: details.etsoCode,
      contractAccountNumber: details.contractAccountNumber,
      unexpectedUsageThreshold: notification.unexpectedUsageThreshold || null,
      usageLimitThreshold: notification.usageLimitThreshold || null,
      consumerGroup: consumer.consumerGroup,
      consumerClass: consumer.consumerClass,
    };
  } catch (err) {
    logger.error("[MassRead CCB Servisi] subscriptionKey yanıtı parse hatası", {
      errorMessage: err.message,
      stack: err.stack,
      rawXmlSample: xml?.substring(0, 500) + "...",
    });
    throw err;
  }
}

//7.8 PUT /subscription/{subscriptionKey}/usage-limit-threshold
function buildUsageLimitThresholdXml(subscriptionKey, threshold) {
  return `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cms="http://oracle.com/CMSUBKEYULT.xsd">
      <soapenv:Header/>
      <soapenv:Body>
        <cms:CMSUBKEYULT dateTimeTagFormat="xsd:strict">
          <cms:subscriptionKeyULTRequest>
            <cms:subscriptionKey>${subscriptionKey}</cms:subscriptionKey>
            <cms:threshold>${threshold}</cms:threshold>
          </cms:subscriptionKeyULTRequest>
        </cms:CMSUBKEYULT>
      </soapenv:Body>
    </soapenv:Envelope>
  `.trim();
}

async function parseUsageLimitThresholdResponse(xml) {
  try {
    const parsed = await xmlParser.parseStringPromise(xml);

    const response =
      parsed?.["soapenv:Envelope"]?.["soapenv:Body"]?.["CMSUBKEYULT"]?.[
        "subscriptionKeyULTResponse"
      ];

    if (!response || !response.status || !response.responseCode) {
      logger.error(
        "[MassRead CCB Servisi] usageLimitThreshold yanıtı format hatası",
        {
          rawXmlSample: xml?.substring(0, 500) + "...",
        }
      );
      throw new Error("CCB yanıtı beklenen formatta değil.");
    }

    return {
      status: response.status,
      responseCode: response.responseCode,
    };
  } catch (err) {
    logger.error("[MassRead CCB Servisi] usageLimitThreshold parse hatası", {
      errorMessage: err.message,
      stack: err.stack,
      rawXmlSample: xml?.substring(0, 500) + "...",
    });
    throw err;
  }
}

//7.9 PUT /subscription/{subscriptionKey}/unexpected-usage-threshold
function buildUnexpectedUsageThresholdXml(subscriptionKey, threshold) {
  return `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cms="http://oracle.com/CMSUBKEYUUT.xsd">
      <soapenv:Header/>
      <soapenv:Body>
        <cms:CMSUBKEYUUT dateTimeTagFormat="xsd:strict">
          <cms:subscriptionKeyUUTRequest>
            <cms:subscriptionKey>${subscriptionKey}</cms:subscriptionKey>
            <cms:threshold>${threshold}</cms:threshold>
          </cms:subscriptionKeyUUTRequest>
        </cms:CMSUBKEYUUT>
      </soapenv:Body>
    </soapenv:Envelope>
  `.trim();
}

async function parseUnexpectedUsageThresholdResponse(xml) {
  try {
    const parsed = await xmlParser.parseStringPromise(xml);

    const response =
      parsed?.["soapenv:Envelope"]?.["soapenv:Body"]?.["CMSUBKEYUUT"]?.[
        "subscriptionKeyUUTResponse"
      ];

    if (!response || !response.status || !response.responseCode) {
      logger.error(
        "[MassRead CCB Servisi] unexpectedUsageThreshold yanıtı format hatası",
        { rawXmlSample: xml?.substring(0, 500) + "..." }
      );
      throw new Error("CCB unexpected-usage yanıtı beklenen formatta değil.");
    }

    return {
      status: response.status,
      responseCode: response.responseCode,
    };
  } catch (err) {
    logger.error(
      "[MassRead CCB Servisi] unexpectedUsageThreshold parse hatası",
      {
        errorMessage: err.message,
        stack: err.stack,
        rawXmlSample: xml?.substring(0, 500) + "...",
      }
    );
    throw err;
  }
}

//7.10 DELETE /subscription/{subscriptionKey}
function buildSubscriptionDeleteXml(subscriptionKey) {
  return `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cms="http://oracle.com/CMSUBKEYDEL.xsd">
      <soapenv:Header/>
      <soapenv:Body>
        <cms:CMSUBKEYDEL dateTimeTagFormat="xsd:strict">
          <cms:subscriptionKeyDelRequest>
            <cms:subscriptionKey>${subscriptionKey}</cms:subscriptionKey>
          </cms:subscriptionKeyDelRequest>
        </cms:CMSUBKEYDEL>
      </soapenv:Body>
    </soapenv:Envelope>
  `.trim();
}

async function parseSubscriptionDeleteResponse(xml) {
  try {
    const parsed = await xmlParser.parseStringPromise(xml);

    const response =
      parsed?.["soapenv:Envelope"]?.["soapenv:Body"]?.["CMSUBKEYDEL"]?.[
        "subscriptionKeyDelResponse"
      ];

    if (!response || !response.status || !response.responseCode) {
      logger.error(
        "[MassRead CCB Servisi] subscriptionDelete yanıtı format hatası",
        {
          rawXmlSample: xml?.substring(0, 500) + "...",
        }
      );
      throw new Error("CCB delete yanıtı beklenen formatta değil.");
    }

    return {
      status: response.status,
      responseCode: response.responseCode,
    };
  } catch (error) {
    logger.error(
      "[MassRead CCB Servisi] subscriptionDelete yanıtı parse hatası",
      {
        errorMessage: err.message,
        stack: err.stack,
        rawXmlSample: xml?.substring(0, 500) + "...",
      }
    );
    throw err;
  }
}

module.exports = {
  buildSubscriptionCheckXml,
  buildSubscriptionKeyQueryXml,
  buildUsageLimitThresholdXml,
  buildUnexpectedUsageThresholdXml,
  buildSubscriptionDeleteXml,
  callCcb,
  parseSubscriptionKeyResponse,
  parseSubscriptionCheckResponse,
  parseUsageLimitThresholdResponse,
  parseUnexpectedUsageThresholdResponse,
  parseSubscriptionDeleteResponse,
};
