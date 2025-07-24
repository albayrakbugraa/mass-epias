const complaintService = require("../services/complaintService");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

// 7.12 POST /complaint
exports.saveComplaint = async (req, res) => {
  try {
    await complaintService.saveComplaint(req.body);
    res
      .status(201)
      .json({ success: true, message: "Şikayet başarıyla kaydedildi." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 7.12 POST /complaint
exports.linkFilesByDownloadUrl = async (req, res) => {
  const { complaintId, urlList } = req.body;
  if (!complaintId || !Array.isArray(urlList)) {
    return res
      .status(400)
      .json({ success: false, error: "Eksik veya hatalı parametreler." });
  }
  try {
    await complaintService.linkFilesByDownloadUrl(complaintId, urlList);
    res.json({ success: true, message: "Dosyalar eşlendi." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

//7.13 GET /complaint/{complaintId}
exports.getComplaint = async (req, res) => {
  const { complaintId } = req.params;
  try {
    const complaint = await complaintService.getComplaint(complaintId);
    if (!complaint) {
      return res
        .status(404)
        .json({ success: false, error: "Şikayet bulunamadı." });
    }
    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getFileUrlsByComplaintId = async (req, res) => {
  const { complaintId } = req.params;
  try {
    const urls = await complaintService.getFileUrlsByComplaintId(complaintId);
    res.json({ success: true, urls });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

//7.14 POST /complaint/file
exports.createComplaintFile = async (req, res) => {
  const { name, mimeType, size } = req.body;
  if (!name || !mimeType || !size) {
    return res.status(422).json({
      success: false,
      error: "name, mimeType ve size zorunludur.",
    });
  }

  try {
    const fileId = uuidv4();
    const extension = path.extname(name) || "";
    const fileName = fileId + extension;

    const baseUrl = process.env.BASE_PUBLIC_URL;
    const uploadUrl = `${baseUrl}/uploads/${fileName}`;
    const downloadUrl = `${baseUrl}/complaint/file/download/${fileId}`;

    const uploadExpireMinutes = parseInt(
      process.env.UPLOAD_EXPIRE_MINUTES || "60"
    );
    const expiresAt = new Date(Date.now() + uploadExpireMinutes * 60 * 1000);

    await complaintService.saveComplaintFile({
      fileId,
      name,
      mimeType,
      size,
      uploadUrl,
      downloadUrl,
      uploadExpiresAt: expiresAt.toISOString(),
    });

    return res.status(201).json({
      fileId,
      uploadUrl,
      downloadUrl,
      expiresAt,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

//7.15 PATCH /complaint/file/{id}
exports.confirmComplaintFileUpload = async (req, res) => {
  const fileId = req.params.id;

  // Alfanümerik ve max 32 karakter kontrolü
  if (!fileId || typeof fileId !== "string" || fileId.length > 32) {
    return res.status(200).json({ id: null });
  }

  try {
    const fileInfo = await complaintService.getUploadInfo(fileId);
    if (!fileInfo || !fileInfo.FILE_ID || fileInfo.FILE_ID.length > 32) {
      // Dosya kaydı yok veya ID geçersiz
      return res.status(200).json({ id: null });
    }

    // Fiziksel dosya kontrolü
    const physicallyExists = await complaintService.checkFilePhysicallyExists(
      fileId,
      fileInfo.NAME
    );
    if (!physicallyExists) {
      return res.status(200).json({ id: null });
    }

    // DB'de "yüklendi" olarak işaretle
    if (fileInfo.IS_UPLOADED !== 1) {
      await complaintService.markFileUploaded(fileId);
    }
    // Başarıyla veya zaten yüklenmişse, ID dönülür!
    return res.status(200).json({ id: fileId });
  } catch (err) {
    return res.status(200).json({ id: null });
  }
};

//7.16 DELETE /complaint/{complaintId}
exports.deleteComplaint = async (req, res) => {
  const complaintId = req.params.complaintId;

  logger.info("[DELETE /complaint/:complaintId] İstek alındı", {
    complaintId,
  });

  if (!complaintId) {
    logger.warn("[DELETE /complaint/:complaintId] Geçersiz complaintId");
    return res.status(422).json({
      error: "Geçerli bir complaintId zorunludur.",
    });
  }

  try {
    const result = await complaintService.passivateComplaint(complaintId);

    if (result) {
      logger.info("[DELETE /complaint/:complaintId] Şikayet pasife çekildi", {
        complaintId,
      });
      return res.status(200).json({ status: "Şikayet pasife çekildi." });
    } else {
      logger.warn("[DELETE /complaint/:complaintId] Şikayet bulunamadı", {
        complaintId,
      });
      return res.status(404).json({ error: "Şikayet bulunamadı." });
    }
  } catch (err) {
    logger.error("[DELETE /complaint/:complaintId] Hata oluştu", {
      errorMessage: err.message,
    });
    return res.status(500).json({ error: err.message });
  }
};

exports.getUploadInfo = async (req, res) => {
  const fileId = req.params.fileId;

  logger.info("[GET /complaint/file/info/:fileId] İstek alındı", {
    fileId,
  });

  if (!fileId) {
    logger.warn("[GET /complaint/file/info/:fileId] Eksik fileId");
    return res.status(422).json({
      error: "fileId path parametresi zorunludur.",
    });
  }

  try {
    const fileInfo = await complaintService.getUploadInfo(fileId);
    if (!fileInfo) {
      logger.warn("[GET /complaint/file/info/:fileId] Dosya bulunamadı", {
        fileId,
      });
      return res.status(404).json({ error: "Dosya bulunamadı.", spanIds });
    }
    logger.info("[GET /complaint/file/info/:fileId] Başarıyla döndü", {
      fileId,
    });
    return res.json(fileInfo);
  } catch (err) {
    logger.error("[GET /complaint/file/info/:fileId] Hata oluştu", {
      fileId,
      error: err.message,
    });
    return res.status(500).json({
      error: "File verisi getirilemedi.",
      detail: err.message,
    });
  }
};
