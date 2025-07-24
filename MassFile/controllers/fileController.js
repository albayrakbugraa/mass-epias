const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fileService = require("../services/fileService");
const logger = require("../utils/logger");
const fs = require("fs");

const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '../uploads');





// DOWNLOAD /file/download/:fileId
 exports.downloadComplaintFile = async (req, res) => {
    const fileId = req.params.fileId;
    const correlationId = req.headers["x-correlation-id"] || uuidv4();
  
    try {
      // 1. Dosya meta verisini MassDbSrvc'den çek
      const fileInfo = await fileService.getUploadInfo(fileId);
  
      if (!fileInfo) {
        return res.status(404).send("Dosya kaydı bulunamadı.");
      }
  
      if (fileInfo.IS_UPLOADED !== 1) {
        return res.status(403).send("Dosya henüz yüklenmemiş.");
      }
  
      const extension = path.extname(fileInfo.NAME);
      const fileName = fileId + extension;
      const uploadDir = path.join(__dirname, "../uploads");
      const filePath = path.join(uploadDir, fileName);
  
      if (!fs.existsSync(filePath)) {
        return res.status(404).send("Fiziksel dosya bulunamadı.");
      }
  
      res.setHeader("Content-Type", fileInfo.MIME_TYPE);
  
      logger.info("[DOWNLOAD] Dosya indiriliyor", {
        correlationId,
        fileId,
        name: fileInfo.NAME,
        mime: fileInfo.MIME_TYPE,
        timestamp: new Date().toISOString(),
      });
  
      return res.download(filePath, fileInfo.NAME);
    } catch (err) {
      logger.error("İndirme hatası:", {
        correlationId,
        errorMessage: err.message,
      });
      return res.status(500).send("Dosya indirilemedi.");
    }
  };


exports.uploadFile = (req, res) => {
  const { fileName } = req.params;
  const uploadDir = path.join(__dirname, '../uploads');
  const filePath = path.join(uploadDir, fileName);

  // upload dizini yoksa oluştur
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  // Dosya içeriğini direkt stream ederek kaydet
  const writeStream = fs.createWriteStream(filePath);
  req.pipe(writeStream);

  writeStream.on('finish', () => {
    return res.status(200).json({ success: true, message: "Dosya yüklendi.", fileName });
  });

  writeStream.on('error', (err) => {
    return res.status(500).json({ success: false, error: "Dosya kaydedilemedi: " + err.message });
  });
};

//Dosya kontrolü
exports.fileExists = (req, res) => {
  const { fileId } = req.params;
  const { name } = req.query;

  logger.info("[GET /file/exists/:fileId] İstek alındı", { fileId, name });

  if (!fileId) {
    logger.error("[GET /file/exists/:fileId] Eksik fileId", { fileId });
    return res.status(400).json({ exists: false, error: "fileId zorunlu" });
  }

  let exists = false;
  try {
    if (name) {
      const filePath = path.join(uploadDir, name);
      exists = fs.existsSync(filePath);
      logger.info("[fileExists] Dosya adı ile kontrol", { filePath, exists });
    } else {
      if (!fs.existsSync(uploadDir)) {
        exists = false;
        logger.info("[fileExists] uploads klasörü yok", { uploadDir });
      } else {
        const files = fs.readdirSync(uploadDir);
        exists = files.some(f => f.startsWith(fileId));
        logger.info("[fileExists] fileId ile başlayan dosya kontrolü", { fileId, exists });
      }
    }
  } catch (err) {
    exists = false;
    logger.error("[fileExists] Hata oluştu", { error: err.message });
  }

  logger.info("[GET /file/exists/:fileId] Cevap", { fileId, exists });
  return res.json({ exists });
};

//Upload File
exports.uploadFile = (req, res) => {
  const { fileName } = req.params;

  if (!fileName) {
    logger.error("[PUT /uploads/:fileName] fileName parametresi eksik!");
    return res.status(400).json({ success: false, error: "fileName parametresi zorunludur." });
  }

  // uploads klasörü yoksa oluştur
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.info(`[PUT /uploads/:fileName] uploads klasörü oluşturuldu: ${uploadDir}`);
  }

  const filePath = path.join(uploadDir, fileName);
  const writeStream = fs.createWriteStream(filePath);

  // Pipe ile dosya yazılır
  req.pipe(writeStream);

  writeStream.on('finish', () => {
    logger.info("[PUT /uploads/:fileName] Dosya başarıyla yüklendi.", { fileName, filePath });
    res.status(200).json({ success: true, message: "Dosya yüklendi.", fileName });
  });

  writeStream.on('error', (err) => {
    logger.error("[PUT /uploads/:fileName] Dosya yüklenirken hata.", { fileName, error: err.message });
    res.status(500).json({ success: false, error: "Dosya kaydedilemedi: " + err.message });
  });
};