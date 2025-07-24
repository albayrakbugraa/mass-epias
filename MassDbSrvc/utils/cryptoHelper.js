const forge = require("node-forge");

/**
 * Public key ile gelen imzayı doğrular
 * @param {Object} payload - Doğrulanacak veri (örn: { url, publicKey })
 * @param {string} signature - Base64 X-Signature header değeri
 * @returns {boolean} doğrulama başarılıysa true
 */
function verifySignature(payload, signature) {
  try {
    const md = forge.md.sha256.create();
    const serialized = JSON.stringify(payload);

    md.update(serialized, "utf8");

    const publicKeyPem = payload.publicKey;
    const pubKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const decodedSig = forge.util.decode64(signature);

    return pubKey.verify(md.digest().bytes(), decodedSig);
  } catch (err) {
    return false;
  }
}

module.exports = { verifySignature };
