const { v4: uuidv4 } = require('uuid');
const mLib = require('../Libs/Ala00Lib');

async function getReadings(req, res) {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    const subscriptionKey = req.params.subscriptionKey;

    try {
        mLib.log(`[GET /readings] Abonelik verisi isteniyor. SUBS_KEY: ${subscriptionKey}, CID: ${correlationId}`);

        // TODO: Buraya readings çekme logic'i eklenecek

        res.status(200).json({
            status: 200,
            correlationId,
            body: {
                message: 'readings endpoint aktif, logic henüz eklenmedi.'
            }
        });
    } catch (err) {
        mLib.error(`[GET /readings] Hata: ${err.message}`);
        res.status(500).json({
            status: 500,
            correlationId,
            errors: [{
                errorCode: '(EDAS)readings-error',
                errorMessage: err.message
            }]
        });
    }
}

module.exports = {
    getReadings
};