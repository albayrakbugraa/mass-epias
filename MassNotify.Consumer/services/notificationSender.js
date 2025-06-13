const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../Libs/db');

// DB'den en son aktif webhook url ve private key'i alır
async function getWebhookUrlAndPrivateKey() {
    const conn = await db.getConnSimple();
    try {
        const result = await conn.execute(
            `SELECT WEBHOOK_URL, PRIVATE_KEY 
               FROM MASS_WEBHOOK_KEYS 
              WHERE IS_ACTIVE = 1
              ORDER BY CREATED_DATE DESC`
        );
        if (result.rows.length === 0) {
            throw new Error("Aktif webhook anahtarı bulunamadı!");
        }
        const [url, privateKey] = result.rows[0];
        return { url, privateKey };
    } finally {
        await conn.close();
    }
}

// Gönderilecek bildirim içeriği ve tipi dışarıdan alınır
async function sendNotificationToEpias(bodyObj) {
    // 1. DB'den url ve private key al
    const { url: webhookUrl, privateKey } = await getWebhookUrlAndPrivateKey();

    // 2. Body'yi json string olarak hazırla
    const rawBody = JSON.stringify(bodyObj);

    // 3. İmzala
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(rawBody);
    signer.end();
    const signature = signer.sign(
        { key: privateKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 }
    ).toString('base64');

    // 4. Headerlar
    const headers = {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Request-ID': uuidv4(),
        'X-Correlation-ID': uuidv4()
    };

    // 5. POST isteğini gönder
    try {
        const response = await axios.post(webhookUrl, rawBody, { headers });
        return { success: true, data: response.data };
    } catch (err) {
        // Hata durumunu detaylı logla ve dön
        return {
            success: false,
            status: err.response?.status || 500,
            error: err.response?.data || err.message
        };
    }
}

module.exports = { sendNotificationToEpias };
