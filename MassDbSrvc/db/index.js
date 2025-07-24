require('dotenv').config();
const oracledb = require('oracledb');
const path = require('path');
const logger = require('../utils/logger'); 

let pool;

// (Opsiyonel) Oracle client yolunu platforma göre başta ayarla
function initOracleClientIfNeeded() {
  // MacOS veya custom Oracle client kullanıyorsak:
  if (process.env.ORACLE_CLIENT_LIB_DIR) {
    try {
      oracledb.initOracleClient({ libDir: process.env.ORACLE_CLIENT_LIB_DIR });
      logger && logger.info(`[DB] OracleClient init: ${process.env.ORACLE_CLIENT_LIB_DIR}`);
    } catch (err) {
      logger && logger.error('[DB] OracleClient init hatası', { error: err.message });
      // process.exit(1); // ilk açılışta hata varsa zorunlu değil
    }
  }
}

async function initialize() {
  if (pool) return pool;
  initOracleClientIfNeeded();

  logger && logger.info('[DB] Pool initialize başlatılıyor.');
  pool = await oracledb.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING,
    poolMin: 1,
    poolMax: 10,
    poolIncrement: 1,
    // poolTimeout: 60 // Gerekirse idle timeout eklenebilir
  });
  logger && logger.info('[DB] Oracle Pool hazır.');
  return pool;
}

async function getConnection() {
  if (!pool) await initialize();
  try {
    const conn = await pool.getConnection();
    logger && logger.debug('[DB] Yeni connection çekildi');
    return conn;
  } catch (err) {
    logger && logger.error('[DB] Connection alınamadı', { error: err.message });
    throw err;
  }
}

// Sağlıklı kapatma için
async function closePool() {
  if (pool) {
    await pool.close();
    logger && logger.info('[DB] Pool kapatıldı.');
    pool = null;
  }
}

module.exports = {
  initialize,
  getConnection,
  closePool
};

