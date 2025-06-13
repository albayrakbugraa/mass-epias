const crypto = require('crypto');
const db = require('../Libs/db');

// RSA anahtar çifti üretir
function generateKeyPair() {
    return crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
}

exports.rotateAndSaveKey = async (url) => {
    // 1. Önce mevcut aktif key(leri) pasif yap
    const conn = await db.getConnSimple();
    try {
        await conn.execute(
            `UPDATE MASS_WEBHOOK_KEYS SET IS_ACTIVE = 0, INVALIDATED_DATE = SYSTIMESTAMP WHERE IS_ACTIVE = 1`
        );
        // 2. Yeni anahtar çifti üret
        const { publicKey, privateKey } = generateKeyPair();
        // 3. Yeni kaydı ekle
        await conn.execute(
            `INSERT INTO MASS_WEBHOOK_KEYS (WEBHOOK_URL, PUBLIC_KEY, PRIVATE_KEY, IS_ACTIVE)
             VALUES (:url, :publicKey, :privateKey, 1)`,
            { url, publicKey, privateKey }
        );
        await conn.commit();
        return publicKey;
    } finally {
        await conn.close();
    }
};



