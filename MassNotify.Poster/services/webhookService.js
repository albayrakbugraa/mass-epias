const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

const configPath = path.join(__dirname, '../config/webhook-config.json');

function generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    return { publicKey, privateKey };
}

async function setWebhookUrlAndRegenerateKeys(url) {
    let config = {};
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    const oldKeys = config.oldKeys || [];
    if (config.privateKey && config.publicKey) {
        oldKeys.push({
            publicKey: config.publicKey,
            privateKey: config.privateKey,
            generatedAt: Date.now()
        });
        // 5 dakikadan eski anahtarları sil
        const now = Date.now();
        while (oldKeys.length > 0 && now - oldKeys[0].generatedAt > 5 * 60 * 1000) {
            oldKeys.shift();
        }
    }
    const { publicKey, privateKey } = generateKeyPair();

    config.url = url;
    config.publicKey = publicKey;
    config.privateKey = privateKey;
    config.oldKeys = oldKeys;
    config.updatedAt = new Date().toISOString();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    logger.info("[webhookService] Webhook ve anahtar güncellendi", { url });
    return publicKey;
}

module.exports = {
    setWebhookUrlAndRegenerateKeys
};
