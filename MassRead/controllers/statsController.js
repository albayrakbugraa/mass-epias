const { v4: uuidv4 } = require('uuid');
const mLib = require('../Libs/Ala00Lib');

async function getStats(req, res) {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();

    try {
        mLib.log(`[GET /stats] Sistem istatistikleri isteniyor. CID: ${correlationId}`);

        // TODO: Buraya stats logic'i eklenecek

        res.status(200).json({
            status: 200,
            correlationId,
            body: {
                message: 'stats endpoint aktif, logic henüz eklenmedi.'
            }
        });
    } catch (err) {
        mLib.error(`[GET /stats] Hata: ${err.message}`);
        res.status(500).json({
            status: 500,
            correlationId,
            errors: [{
                errorCode: '(EDAS)stats-error',
                errorMessage: err.message
            }]
        });
    }
}

module.exports = {
    getStats
};