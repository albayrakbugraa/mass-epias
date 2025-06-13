const mLib = require('../Libs/Ala00Lib');
const { v4: uuidv4 } = require('uuid');

async function getVersions(req, res) {
    const supportedVersions = ["v1"];
    const spanIds = "(edas-mass-read)"+ uuidv4(); 

    try {
        mLib.log(`[GET /versions] Versiyon bilgisi döndürülüyor. CorrelationId: ${req.headers['x-correlation-id'] || ''}`);

        res.sendResponse({
            status: 200, // Sadece numeric code ver, middleware otomatik açıklama ekler
            spanIds,
            body: supportedVersions
        });
    } catch (err) {
        mLib.error(`[GET /versions] Hata oluştu. CorrelationId: ${req.headers['x-correlation-id'] || ''}, Hata: ${err.message}`);
        res.sendResponse({
            status: 500,
            spanIds: "(edas-massread-service)-get-versions-error",
            errors: [{
                errorCode: '(EDAS)server-internal-error',
                errorMessage: 'Dahili sunucu hatası oluştu.'
            }]
        });
    }
}

module.exports = {
    getVersions
};
