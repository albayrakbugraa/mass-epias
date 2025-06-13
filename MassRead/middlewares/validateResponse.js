const { v4: uuidv4 } = require('uuid');

function getStatusText(status) {
    const codes = {
        200: "200 OK",
        400: "400 Bad Request",
        401: "401 Unauthorized",
        403: "403 Forbidden",
        404: "404 Not Found",
        422: "422 Unprocessable Entity",
        500: "500 Internal Server Error",
        522: "522 Connection Timed Out"
    };
    return codes[status] || `${status}`;
}

function responseMiddleware(req, res, next) {
    res.sendResponse = ({
        status = 200,
        spanIds = "",
        successMessage = null,
        errors = null,
        body = null
    }) => {
        // Header'lar
        res.setHeader('Content-Type', 'application/json');
        const responseId = uuidv4();
        res.setHeader('X-Response-ID', responseId);

        let correlationId = req.headers['x-correlation-id'] || "";
        if (correlationId) {
            res.setHeader('X-Correlation-ID', correlationId);
        }

        res.status(status).json({
            status: getStatusText(status),
            spanIds,            
            correlationId: correlationId || undefined,
            successMessage,
            errors,
            body
        });
    };
    next();
}

module.exports = responseMiddleware;
