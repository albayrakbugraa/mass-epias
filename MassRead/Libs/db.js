//Libs/db.js
// nvm use v18.4.0;node api_key_manager.js
require('dotenv').config(); 
const oracledb = require('oracledb');
var mLib = require('./Ala00Lib.js'); // mLib'i dahil et
mLib.Owner = 'db.js'; // Loglarda bu modülün ismini görmek için

const os = require('os');
let consts = require('./webconsts.js'); // webconsts'i dahil et

// oracledb global ayarları
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT; // Sonuçları obje olarak almak için global ayar
oracledb.autoCommit = true; // Tüm bağlantılar için otomatik commit varsayılan olarak açık

const isAppleSilicon = () => {
  const platform = os.platform();
  const arch = os.arch();
  // mLib.log('Platform:', platform, 'Arch:', arch); // Loglama için mLib kullan
  return platform === 'darwin' && arch === 'x64'; // Apple Silicon'da bazen 'x64' emülasyonunda çalışabilir
};

// oracledb initOracleClient çağrısı burada yapılmalı
try {
    if (isAppleSilicon()) {
        oracledb.initOracleClient({libDir: consts.oracleLib.dev});
        mLib.log('Oracle Client init. (Apple Silicon detected):', consts.oracleLib.dev); // mLib ile logla
    } else {
        // Diğer platformlar için de bir yol belirtilmeli veya otomatik bulunması sağlanmalı
        // Örneğin: oracledb.initOracleClient({libDir: process.env.ORACLE_CLIENT_LIB_DIR});
        mLib.log("Oracle lib path:", process.env.ORACLE_CLIENT_LIB_DIR);
        oracledb.initOracleClient({ libDir: process.env.ORACLE_CLIENT_LIB_DIR });
        mLib.log('Oracle Client init. (Non-Apple Silicon or default path)'); // mLib ile logla
    }
} catch (err) {
  mLib.error('Oracle Client init. hatası!'); // mLib ile hata logla (eğer mLib.error varsa)
  mLib.error(err); // mLib ile hata logla
  // process.exit(1); // Geliştirme ortamında çıkışı engellemek için yorum satırı yapabiliriz.
}

module.exports.getConn = async function (isLocal, inConf) {
    // isLocal parametresi artık initOracleClient için kullanılmıyor,
    // çünkü initOracleClient uygulama başlangıcında bir kez çağrılıyor.
    // Bu fonksiyon sadece getConnection için inConf kullanacak.
    mLib.log('Veritabanı bağlantısı isteniyor:', inConf.connectString); // mLib ile logla
    return await oracledb.getConnection(inConf);
};

module.exports.getConnSimple = async function (inConfig) {
  mLib.log('Basit veritabanı bağlantısı isteniyor:', inConfig.connectString); // mLib ile logla
  return await oracledb.getConnection(inConfig);
};

module.exports.getConnSimpleOpt = async function (inCommit, inConfig) {
  oracledb.autoCommit = inCommit; // Bu, autoCommit'i anlık olarak değiştirebilir, dikkatli kullanmalı
  mLib.log('Opsiyonel basit veritabanı bağlantısı isteniyor, autoCommit:', inCommit); // mLib ile logla
  return await oracledb.getConnection(inConfig);
};