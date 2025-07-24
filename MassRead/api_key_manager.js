// api_key_manager.js
//nvm use v18.4.0;node api_key_manager.js

require("dotenv").config(); // .env dosyasındaki değişkenleri yükle
const logger = require("./utils/logger.js");

const crypto = require("crypto");
const readline = require("readline");
let db = require("./Libs/db.js");
const mLib = require("./Libs/Ala00Lib.js"); // Ala00Lib'i dahil et
mLib.Owner = "api_key_manager.js"; // Loglarda bu modülün ismini görmek için

// Oracle DB Bağlantı Ayarları .env dosyasından geliyor
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING,
};

// readline arayüzünü oluştur
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Rastgele API Key üretir (Base64 kodlanmış).
 * Dokümandaki 256 karakter/192 byte kuralına uygun.
 * [cite: 75, 76]
 * @param {number} lengthInBytes Key'in bayt cinsinden uzunluğu.
 * @returns {string} Üretilen Base64 kodlu API Key.
 */
function generateApiKey(lengthInBytes = 192) {
  return crypto.randomBytes(lengthInBytes).toString("base64");
}

/**
 * Verilen string'in SHA256 hash'ini hesaplar.
 * @param {string} data Hashlenecek string.
 * @returns {string} SHA256 hash'in onaltılık (hex) gösterimi.
 */
function hashData(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Tüm mevcut API Key'leri veritabanından siler.
 * @returns {Promise<boolean>} Silme işleminin başarılı olup olmadığı.
 */
async function deleteAllApiKeys() {
  let connection;
  try {
    connection = await db.getConnSimple(dbConfig); // db.js'deki fonksiyonu kullan
    const result = await connection.execute(
      `DELETE FROM MASS_API_KEYS`, // Tablo adı güncellendi [cite: 318]
      {} // autoCommit true olduğu için { autoCommit: true } kaldırdım
    );
    logger.info(
      `Veritabanından ${result.rowsAffected} adet mevcut MASS_API_KEYS silindi.`
    );
    return true;
  } catch (err) {
    logger.error("Mevcut MASS_API_KEYS silerken hata oluştu.", {
      errorMessage: err,
    });
    return false;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        logger.error("Veritabanı bağlantısı kapatılırken hata.", {
          errorMessage: err,
        });
      }
    }
  }
}

/**
 * Üretilen API Key'i hashleyip veritabanına kaydeder.
 * @param {string} apiKey Üretilen ham API Key.
 * @param {string} description Key için açıklama (örn: "EPİAŞ Entegrasyon Key 1").
 * @returns {Promise<boolean>} İşlemin başarılı olup olmadığı.
 */
async function saveApiKeyToDb(apiKey, description) {
  let connection;
  try {
    const hashedApiKey = hashData(apiKey);
    connection = await db.getConnSimple(dbConfig); // db.js'deki fonksiyonu kullan

    const result = await connection.execute(
      `INSERT INTO MASS_API_KEYS (HASHED_API_KEY, DESCRIPTION, CREATED_AT, IS_ACTIVE) ` + // Tablo adı güncellendi [cite: 318]
        `VALUES (:hashedApiKey, :description, SYSTIMESTAMP, 1)`,
      {
        hashedApiKey: hashedApiKey,
        description: description,
      }
    ); // autoCommit true olduğu için { autoCommit: true } kaldırdım

    logger.info(
      `API Key hash veritabanına kaydedildi. Eklenen satır sayısı: ${result.rowsAffected}`
    );
    return result.rowsAffected === 1;
  } catch (err) {
    logger.error("Veritabanına API Key kaydederken hata oluştu.", {
      errorMessage: err,
    });
    return false;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        logger.error("Veritabanı bağlantısı kapatılırken hata.", {
          errorMessage: err,
        });
      }
    }
  }
}

/**
 * Yeni API Key'leri üretir, hash'ler ve veritabanına kaydeder.
 * Her üretilen ham key'i de konsola yazdırır.
 * Dokümanda minimum 32 adet API Key üretilmesi gerektiği belirtilmiştir. [cite: 74]
 * @param {number} count Üretilecek API Key adedi.
 */
async function generateAndSaveApiKeys(count) {
  // Uyarı mesajı ver ve onay al
  const answer = await new Promise((resolve) => {
    rl.question(
      `\n!!!! DİKKAT !!!!\nMevcut tüm API Keyler silinecek ve yeni keyler oluşturulacaktır. Bu işlem geri alınamaz.\nDevam etmek istiyor musunuz? (evet/hayır): `,
      (ans) => {
        resolve(ans.toLowerCase());
      }
    );
  });

  if (answer !== "evet") {
    logger.info(`İşlem iptal edildi.`);
    rl.close();
    return;
  }

  // Onay alındı, mevcut keyleri sil
  const deleteSuccess = await deleteAllApiKeys();
  if (!deleteSuccess) {
    logger.error(
      "API Keyler silinirken kritik bir hata oluştu. Yeni keyler oluşturulmayacak."
    );
    rl.close();
    return;
  }
  logger.info(
    `${count} adet yeni API Key üretiliyor ve veritabanına kaydediliyor...`
  );
  for (let i = 0; i < count; i++) {
    const newApiKey = generateApiKey();
    const description = `EPİAŞ Entegrasyon Key ${i + 1}`;
    const success = await saveApiKeyToDb(newApiKey, description);

    if (success) {
      // Ham API Key'i konsola yazdır, bu key elden EPİAŞ'a teslim edilecek. [cite: 74]
      // Üretim ortamında bu çıktıya dikkat et, loglara düşmemeli!
      console.log(`Ham API Key (${description}): ${newApiKey}`);
    } else {
      logger.error(`API Key ${description} üretilemedi veya kaydedilemedi.`);
    }
  }
  logger.info(`Toplam ${count} adet API Key işlemi tamamlandı.`);
  logger.info("Bu ham keyleri yetkili kişi aracılığıyla elden EPİAŞ'a teslim etmeyi unutmayın abijim!"); //[cite: 74]
  rl.close(); // readline arayüzünü kapat
}

// Örnek Kullanım: 32 adet API Key üretip kaydet
// Dokümanda minimum 32 adet API Key isteniyor. [cite: 74]
generateAndSaveApiKeys(32);
