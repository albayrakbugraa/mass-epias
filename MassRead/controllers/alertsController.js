const { v4: uuidv4 } = require('uuid');
const mLib = require('../Libs/Ala00Lib');

async function getAlerts(req, res) {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    const subscriptionKey = req.params.subscriptionKey;

    try {
        mLib.log(`[GET /alerts] Alarm verisi isteniyor. SUBS_KEY: ${subscriptionKey}, CID: ${correlationId}`);

        // TODO: Buraya alert logic'i eklenecek

        res.status(200).json({
            status: 200,
            correlationId,
            body: {
                message: 'alerts endpoint aktif, logic henüz eklenmedi.'
            }
        });
    } catch (err) {
        mLib.error(`[GET /alerts] Hata: ${err.message}`);
        res.status(500).json({
            status: 500,
            correlationId,
            errors: [{
                errorCode: '(EDAS)alerts-error',
                errorMessage: err.message
            }]
        });
    }
}

module.exports = {
    getAlerts
};