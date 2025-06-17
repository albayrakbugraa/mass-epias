const xml2js = require("xml2js");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const https = require("https");

const CCB_SOAP_ENDPOINT =
  process.env.CCB_SOAP_ENDPOINT ||
  "https://10.41.67.200:6501/ouaf/XAIApp/xaiserver/CMSUBSCHECK";

const CCB_SUBS_KEY_ENDPOINT =
  process.env.CCB_SUBSCRIPTION_KEY_URL ||
  "https://10.41.67.200:6501/ouaf/XAIApp/xaiserver/CMSUBSCRKEY";
const CCB_DEBUG_USER = process.env.CCB_USER || "DEBUGUSER";
const CCB_DEBUG_PASS = process.env.CCB_PASS || "DEBUGUSER00";

const xmlBuilder = new xml2js.Builder({ headless: true });
const xmlParser = new xml2js.Parser({
  explicitArray: false,
  ignoreAttrs: true,
});

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
  const parsed = await xmlParser.parseStringPromise(xml);
  const response =
    parsed?.["soapenv:Envelope"]?.["soapenv:Body"]?.["CMSUBSCHECK"]?.["subscriptionCheckResponse"];

  if (!response) {
    throw new Error("CCB subscriptionCheck yanıtı beklenen formatta değil.");
  }

  return {
    valid: response.valid === "true",
    subscriptionKey: response.subscriptionKey,
    type: response.type,
    startDate: response.startDate
  };
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
  const parsed = await xmlParser.parseStringPromise(xml);

  const responseBody =
    parsed?.["soapenv:Envelope"]?.["soapenv:Body"]?.["CMSUBSCRKEY"]?.[
      "subscriptionKeyResponse"
    ];

  if (!responseBody || !responseBody.subscriptionDetails) {
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
  const parsed = await xmlParser.parseStringPromise(xml);

  const response =
    parsed?.["soapenv:Envelope"]?.["soapenv:Body"]?.["CMSUBKEYULT"]?.[
      "subscriptionKeyULTResponse"
    ];

  if (!response || !response.status || !response.responseCode) {
    throw new Error("CCB yanıtı beklenen formatta değil.");
  }

  return {
    status: response.status,
    responseCode: response.responseCode,
  };
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
  const parsed = await xmlParser.parseStringPromise(xml);

  const response =
    parsed?.["soapenv:Envelope"]?.["soapenv:Body"]?.["CMSUBKEYUUT"]?.["subscriptionKeyUUTResponse"];

  if (!response || !response.status || !response.responseCode) {
    throw new Error("CCB unexpected-usage yanıtı beklenen formatta değil.");
  }

  return {
    status: response.status,
    responseCode: response.responseCode,
  };
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
  const parsed = await xmlParser.parseStringPromise(xml);

  const response =
    parsed?.["soapenv:Envelope"]?.["soapenv:Body"]?.["CMSUBKEYDEL"]?.["subscriptionKeyDelResponse"];

  if (!response || !response.status || !response.responseCode) {
    throw new Error("CCB delete yanıtı beklenen formatta değil.");
  }

  return {
    status: response.status,
    responseCode: response.responseCode,
  };
}



async function callCcb(xmlRequest, correlationId) {
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

  try {
    logger.info("[CCB Servisi] SOAP isteği gönderiliyor...", { correlationId });
    const response = await axios.post(CCB_SOAP_ENDPOINT, xmlRequest, {
      headers,
      httpsAgent: agent,
    });
    logger.info("[CCB Servisi] Yanıt alındı", { correlationId });
    return response.data;
  } catch (err) {
    logger.error("[CCB Servisi] SOAP çağrısı başarısız", {
      correlationId,
      errorMessage: err.message,
    });
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
  parseSubscriptionDeleteResponse
};
