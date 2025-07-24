const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const logger = require("./logger");

/**
 * Ortak header'ları oluşturur.
 */
function createHeaders(baseHeaders = {}, correlationId, requestId, spanIds) {
  return {
    ...baseHeaders,
    "x-correlation-id": correlationId || uuidv4(),
    "x-request-id": requestId || uuidv4(),
    "x-span-ids": spanIds || `(MassRead)-${uuidv4()}`,
    "Content-Type": "application/json",
  };
}

/**
 * Genel amaçlı loglama fonksiyonu
 */
function logRequest(method, url, headers, data) {
  logger.info(`HTTP ${method} isteği gönderiliyor`, {
    event: `${method} ${new URL(url).pathname}`,
    correlationId: headers["x-correlation-id"],
    requestId: headers["x-request-id"],
    spanIds: headers["x-span-ids"],
    url,
    requestBody: data,
  });
}

function logSuccess(method, url, headers, status, response) {
  logger.info(`HTTP ${method} cevabı alındı`, {
    event: `${method} ${new URL(url).pathname}`,
    correlationId: headers["x-correlation-id"],
    requestId: headers["x-request-id"],
    spanIds: headers["x-span-ids"],
    status,
    responseBody: response,
  });
}

function logError(method, url, headers, err) {
  logger.error(`HTTP ${method} isteği başarısız`, {
    event: `${method} ${new URL(url).pathname}`,
    correlationId: headers["x-correlation-id"],
    requestId: headers["x-request-id"],
    spanIds: headers["x-span-ids"],
    status: err.response?.status,
    responseBody: err.response?.data,
    errorMessage: err.message,
  });
}

/**
 * Ortak HTTP fonksiyonları
 */
async function post(url, data = {}, baseHeaders = {}, correlationId, requestId, spanIds) {
  const headers = createHeaders(baseHeaders, correlationId, requestId, spanIds);
  try {
    logRequest("POST", url, headers, data);
    const response = await axios.post(url, data, { headers });
    logSuccess("POST", url, headers, response.status, response.data);
    return response;
  } catch (err) {
    logError("POST", url, headers, err);
    throw err;
  }
}

async function get(url, baseHeaders = {}, correlationId, requestId, spanIds) {
  const headers = createHeaders(baseHeaders, correlationId, requestId, spanIds);
  try {
    logRequest("GET", url, headers);
    const response = await axios.get(url, { headers });
    logSuccess("GET", url, headers, response.status, response.data);
    return response;
  } catch (err) {
    logError("GET", url, headers, err);
    throw err;
  }
}

async function put(url, data = {}, baseHeaders = {}, correlationId, requestId, spanIds) {
  const headers = createHeaders(baseHeaders, correlationId, requestId, spanIds);
  try {
    logRequest("PUT", url, headers, data);
    const response = await axios.put(url, data, { headers });
    logSuccess("PUT", url, headers, response.status, response.data);
    return response;
  } catch (err) {
    logError("PUT", url, headers, err);
    throw err;
  }
}

async function del(url, baseHeaders = {}, correlationId, requestId, spanIds) {
  const headers = createHeaders(baseHeaders, correlationId, requestId, spanIds);
  try {
    logRequest("DELETE", url, headers);
    const response = await axios.delete(url, { headers });
    logSuccess("DELETE", url, headers, response.status, response.data);
    return response;
  } catch (err) {
    logError("DELETE", url, headers, err);
    throw err;
  }
}

module.exports = {
  post,
  get,
  put,
  delete: del,
};
