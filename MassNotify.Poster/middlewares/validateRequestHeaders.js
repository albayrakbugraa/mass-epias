const { v4: uuidv4, validate: uuidValidate, version: uuidVersion } = require('uuid');

function isValidUUIDv4(id) {
    return uuidValidate(id) && uuidVersion(id) === 4;
}

function makeErrorResponse({ status, spanIds, correlationId, errorCode, errorMessage }) {
    return {
        status,
        spanIds,
        correlationId,
        successMessage: null,
        errors: [{
            errorCode,
            errorMessage
        }],
        body: null
    };
}

// Dökümandaki response şemasına tam uyumlu header validasyonu middleware'i
function validateRequestHeaders(req, res, next) {
    const spanIds = "(edas-api-header)" + Math.floor(Math.random() * 10000);

    // Header'ları çekelim
    const authHeader = req.headers['authorization'];
    const contentType = req.headers['content-type'];
    const xRequestId = req.headers['x-request-id'];
    const xCorrelationId = req.headers['x-correlation-id'];

    // CorrelationId her zaman response'da dönecek!
    // Dökümantasyon: header'daki correlation id aynen response'da yer almalı.
    const correlationId = xCorrelationId || uuidv4();

    // 1. Authorization header zorunlu ve Bearer ile başlamalı
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.length < 7 + 256) {
        return res.status(401).json(makeErrorResponse({
            status: "401 Unauthorized",
            spanIds,
            correlationId,
            errorCode: "(EDAS)auth-401",
            errorMessage: "Authorization header eksik, hatalı veya yetersiz uzunlukta"
        }));
    }

    // 2. Content-Type: application/json olmalı
    if (contentType !== 'application/json') {
        return res.status(400).json(makeErrorResponse({
            status: "400 Bad Request",
            spanIds,
            correlationId,
            errorCode: "(EDAS)content-type-400",
            errorMessage: "Content-Type application/json olmalı"
        }));
    }

    // 3. X-Request-ID zorunlu ve UUIDv4 olmalı
    if (!xRequestId || !isValidUUIDv4(xRequestId)) {
        return res.status(400).json(makeErrorResponse({
            status: "400 Bad Request",
            spanIds,
            correlationId,
            errorCode: "(EDAS)x-request-id-400",
            errorMessage: "X-Request-ID eksik veya geçersiz UUIDv4"
        }));
    }

    // 4. X-Correlation-ID zorunlu ve UUIDv4 olmalı
    if (!xCorrelationId || !isValidUUIDv4(xCorrelationId)) {
        return res.status(400).json(makeErrorResponse({
            status: "400 Bad Request",
            spanIds,
            correlationId,
            errorCode: "(EDAS)x-correlation-id-400",
            errorMessage: "X-Correlation-ID eksik veya geçersiz UUIDv4"
        }));
    }

    // Validasyonlar geçtiyse, devam et
    next();
}

module.exports = validateRequestHeaders;
