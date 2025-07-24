const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const logger = require("../utils/logger");
const path = require("path");

const massDbSrvcUrl = process.env.MASS_DB_SRVC_URL;
const massFileUrl = process.env.MASS_FILE_URL;
const SUPPORTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg", // hem jpeg hem jpg için çalışır
  "video/mp4",
  "video/quicktime", // MOV
  "video/x-msvideo", // AVI
];
// file extension  kontrol
const SUPPORTED_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".mp4",
  ".mov",
  ".avi",
];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function generateTracing(req, label = "MassRead-Complaint") {
  return {
    correlationId: req.headers["x-correlation-id"] || uuidv4(),
    requestId: req.headers["x-request-id"] || uuidv4(),
    spanIds: `(${label})-${uuidv4()}`,
  };
}

function logContext(event, tracing, extra = {}) {
  return {
    event,
    ...tracing,
    ...extra,
  };
}

//POST /complaint
exports.createComplaint = async (req, res) => {
  const tracing = generateTracing(req);
  const { requestId, ...safeTracing } = tracing;
  const event = "POST /complaint";

  const {
    complaintId,
    category,
    subCategory,
    content,
    files = [],
    subscriptionKey,
  } = req.body;

  logger.info(
    "Şikayet oluşturma isteği alındı",
    logContext(event, tracing, {
      complaintId,
      category,
      subCategory,
      content,
      files,
      subscriptionKey,
    })
  );

  // Validation
  if (!complaintId || !subscriptionKey || !category || !content) {
    logger.warn("Eksik parametre", logContext(event, tracing));
    return res.sendResponse({
      status: 422,
      ...safeTracing,
      errors: [
        {
          errorCode: "(MassRead)validation-422",
          errorMessage:
            "Zorunlu alanlar eksik: complaintId, subscriptionKey, category, content",
        },
      ],
    });
  }

  try {
    logger.info("[POST /complaint] MassDbSrvc'ye şikayet kaydı gönderiliyor", {
      correlationId,
      complaintId,
      subscriptionKey,
    });
    // Şikayet kaydını MassDbSrvc'ye gönder
    await axios.post(`${massDbSrvcUrl}/complaint`, {
      complaintId,
      subscriptionKey,
      category,
      subCategory,
      content,
    });

    // 2. Dosyaları şikayetle eşleştir (varsa)

    if (files.length > 0) {
      logger.info("[POST /complaint] Dosyayı şikayetle eşleştirme başlıyor", {
        correlationId,
        complaintId,
        files,
      });
      await axios.put(`${massDbSrvcUrl}/complaint/link-files`, {
        complaintId,
        urlList: files,
      });
      logger.info("[POST /complaint] Dosyalar şikayetle ilişkilendirildi", {
        correlationId,
        complaintId,
        fileCount: files.length,
      });
    }

    logger.info("[POST /complaint] Şikayet başarıyla kaydedildi", {
      correlationId,
      complaintId,
    });

    return res.sendResponse({
      status: 200,
      spanIds,
      body: { status: "Şikayet başarıyla oluşturuldu." },
    });
  } catch (err) {
    logger.error("[POST /complaint] Hata oluştu", {
      correlationId,
      complaintId,
      errorMessage: err.message,
      stack: err.stack,
      response: err.response?.data,
      status: err.response?.status,
    });

    return res.sendResponse({
      status: 500,
      spanIds,
      errors: [
        {
          errorCode: "(MassRead)internal-error",
          errorMessage: err.message || "Bilinmeyen hata",
        },
      ],
    });
  }
};

//GET /complaint/{complaintId}
exports.getComplaintDetails = async (req, res) => {
  const complaintId = req.params.complaintId;
  const correlationId = req.headers["x-correlation-id"] || uuidv4();
  const spanIds = "(MassRead-Complaint)-" + uuidv4();

  logger.info("[GET /complaint/:complaintId] İstek alındı", {
    correlationId,
    complaintId,
  });

  if (!complaintId) {
    logger.warn("[GET /complaint/:complaintId] Geçersiz complaintId", {
      correlationId,
      complaintId,
    });

    return res.sendResponse({
      status: 422,
      spanIds,
      correlationId,
      errors: [
        {
          errorCode: "(MassRead)validation-422",
          errorMessage: "Geçerli bir complaintId zorunludur.",
        },
      ],
    });
  }

  try {
    logger.info("[GET /complaint/:complaintId] MassDbSrvc sorgusu başlıyor", {
      correlationId,
      complaintId,
    });

    // 1. Şikayet detayı MassDbSrvc'den çek
    const complaintRes = await axios.get(
      `${massDbSrvcUrl}/complaint/${complaintId}`
    );
    const complaint = complaintRes.data?.complaint;

    if (!complaint) {
      logger.warn("[GET /complaint/:complaintId] Şikayet bulunamadı", {
        correlationId,
        complaintId,
      });

      return res.sendResponse({
        status: 404,
        spanIds,
        correlationId,
        errors: [
          {
            errorCode: "(MassRead)complaint-not-found",
            errorMessage: "Şikayet bulunamadı.",
          },
        ],
      });
    }

    // 2. Dosya url'leri MassDbSrvc'den çek
    const fileRes = await axios.get(
      `${massDbSrvcUrl}/complaint/${complaintId}/files`
    );
    const files = fileRes.data?.urls;

    logger.info("[GET /complaint/:complaintId] Şikayet detayları alındı", {
      correlationId,
      complaintId,
      hasFiles: files.length > 0,
      fileCount: files.length,
    });

    return res.sendResponse({
      status: 200,
      spanIds,
      correlationId,
      body: {
        category: complaint.CATEGORY,
        subCategory: complaint.SUB_CATEGORY,
        content: complaint.CONTENT,
        status: complaint.STATUS,
        files: files.length > 0 ? files : null,
      },
    });
  } catch (err) {
    logger.error("[GET /complaint/:complaintId] Hata oluştu", {
      correlationId,
      complaintId,
      errorMessage: err.message,
      stack: err.stack,
      response: err.response?.data,
      status: err.response?.status,
    });

    return res.sendResponse({
      status: 500,
      spanIds,
      correlationId,
      errors: [
        {
          errorCode: "(MassRead)internal-error",
          errorMessage: err.message,
        },
      ],
    });
  }
};

//POST /complaint/file
exports.createComplaintFile = async (req, res) => {
  const correlationId = req.headers["x-correlation-id"] || uuidv4();
  const spanIds = "(MassRead-Complaint)-" + uuidv4();

  const { name, mimeType, size } = req.body;

  logger.info("[POST /complaint/file] İstek alındı", {
    correlationId,
    name,
    mimeType,
    size,
  });

  // Zorunlu alan kontrolü
  if (!name || !mimeType || !size) {
    logger.warn("[POST /complaint/file] Eksik parametre", {
      correlationId,
      name,
      mimeType,
      size,
    });
    return res.sendResponse({
      status: 422,
      spanIds,
      errors: [
        {
          errorCode: "(MassRead)validation-422",
          errorMessage: "name, mimeType ve size zorunludur.",
        },
      ],
    });
  }

  // MIME type kontrolü
  if (!SUPPORTED_TYPES.includes(mimeType)) {
    return res.sendResponse({
      status: 415, // Unsupported Media Type
      spanIds,
      errors: [
        {
          errorCode: "(MassRead)unsupported-type",
          errorMessage: `Desteklenmeyen dosya tipi: ${mimeType}`,
        },
      ],
    });
  }

  // Extension kontrolü
  const ext = path.extname(name).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    logger.warn("[POST /complaint/file] Desteklenmeyen dosya uzantısı", {
      correlationId,
      name,
      ext,
    });
    return res.sendResponse({
      status: 415,
      spanIds,
      errors: [
        {
          errorCode: "(MassRead)unsupported-extension",
          errorMessage: `Desteklenmeyen dosya uzantısı: ${ext}`,
        },
      ],
    });
  }

  // Dosya boyutu kontrolü
  if (size > MAX_FILE_SIZE) {
    logger.warn("[POST /complaint/file] Dosya boyutu maksimum limit aşıldı", {
      correlationId,
      name,
      size,
      max: MAX_FILE_SIZE,
    });
    return res.sendResponse({
      status: 413, // Payload Too Large
      spanIds,
      errors: [
        {
          errorCode: "(MassRead)file-too-large",
          errorMessage: "Dosya boyutu maksimum 50MB olmalı.",
        },
      ],
    });
  }

  try {
    logger.info(
      "[POST /complaint/file] MassDbSrvc'ye upload url isteği gönderiliyor",
      {
        correlationId,
        name,
        mimeType,
        size,
      }
    );

    const resp = await axios.post(
      `${process.env.MASS_DB_SRVC_URL}/complaint/file`,
      {
        name,
        mimeType,
        size,
      }
    );

    logger.info("[POST /complaint/file] Dosya upload url başarıyla alındı", {
      correlationId,
      fileId: resp.data?.id,
      name,
    });

    return res.sendResponse({
      status: 200,
      spanIds,
      successMessage: "Dosya kaydı oluşturuldu.",
      body: resp.data,
    });
  } catch (err) {
    logger.error("[POST /complaint/file] MassDbSrvc hata", {
      correlationId,
      errorMessage: err.response?.data?.error || err.message,
      stack: err.stack,
      response: err.response?.data,
      status: err.response?.status,
    });
    return res.sendResponse({
      status: err.response?.status || 500,
      spanIds,
      errors: [
        {
          errorCode: "(MassRead)internal-error",
          errorMessage: err.response?.data?.error || err.message,
        },
      ],
    });
  }
};

//PATCH /complaint/file/{id}
exports.confirmComplaintFileUpload = async (req, res) => {
  const fileId = req.params.id;
  const correlationId = req.headers["x-correlation-id"] || uuidv4();
  const spanIds = "(MassRead-Complaint)-" + uuidv4();

  logger.info(
    "[PATCH /complaint/file/:id] Dosya upload kontrol isteği alındı",
    {
      correlationId,
      fileId,
    }
  );

  if (!fileId) {
    logger.warn("[PATCH /complaint/file/:id] Eksik fileId", {
      correlationId,
    });
    return res.sendResponse({
      status: 422,
      spanIds,
      errors: [
        {
          errorCode: "(MassRead)validation-422",
          errorMessage: "fileId path parametresi zorunludur.",
        },
      ],
    });
  }

  try {
    // MassDbSrvc'ye PATCH iletir, response'u aynen client'a döner.
    logger.info(
      "[PATCH /complaint/file/:id] MassDbSrvc'ye patch isteği gönderiliyor",
      {
        correlationId,
        fileId,
      }
    );
    const resp = await axios.patch(
      `${process.env.MASS_DB_SRVC_URL}/complaint/file/${fileId}`
    );
    // resp.data = { id: fileId } veya { id: null }

    logger.info(
      "[PATCH /complaint/file/:id] Dosya upload durumu başarıyla alındı",
      {
        correlationId,
        fileId,
        data: resp.data,
      }
    );

    return res.sendResponse({
      status: 200,
      spanIds,
      body: resp.data, // { id: "..." } veya { id: null }
    });
  } catch (err) {
    logger.error("[PATCH /complaint/file/:id] Hata", {
      correlationId,
      fileId,
      errorMessage: err.response?.data?.error || err.message,
      stack: err.stack,
      response: err.response?.data,
      status: err.response?.status,
    });
    return res.sendResponse({
      status: 500,
      spanIds,
      errors: [
        {
          errorCode: "(MassRead)internal-error",
          errorMessage: err.response?.data?.error || err.message,
        },
      ],
    });
  }
};

//DELETE /complaint/{complaintId}
exports.deleteComplaint = async (req, res) => {
  const complaintId = req.params.complaintId;
  const correlationId = req.headers["x-correlation-id"] || uuidv4();
  const spanIds = "(MassRead-Complaint)-" + uuidv4();

  logger.info("[DELETE /complaint/:complaintId] İstek alındı", {
    correlationId,
    complaintId,
  });

  if (!complaintId) {
    logger.warn("[DELETE /complaint/:complaintId] Geçersiz complaintId", {
      correlationId,
    });

    return res.sendResponse({
      status: 422,
      spanIds,
      errors: [
        {
          errorCode: "(MassRead)validation-422",
          errorMessage: "Geçerli bir complaintId zorunludur.",
        },
      ],
    });
  }

  try {
    logger.info(
      "[DELETE /complaint/:complaintId] MassDbSrvc'ye silme isteği gönderiliyor",
      {
        correlationId,
        complaintId,
      }
    );
    await axios.delete(`${massDbSrvcUrl}/complaint/${complaintId}`);

    logger.info("[DELETE /complaint/:complaintId] Şikayet başarıyla silindi", {
      correlationId,
      complaintId,
    });

    return res.sendResponse({
      status: 200,
      spanIds,
      body: { status: "Şikayet başarıyla silindi." },
    });
  } catch (err) {
    logger.error("[DELETE /complaint/:complaintId] Hata oluştu", {
      correlationId,
      complaintId,
      errorMessage: err.response?.data?.error || err.message,
      stack: err.stack,
      response: err.response?.data,
      status: err.response?.status,
    });

    return res.sendResponse({
      status: err.response?.status || 500,
      spanIds,
      errors: [
        {
          errorCode: "(MassRead)internal-error",
          errorMessage: err.response?.data?.error || err.message,
        },
      ],
    });
  }
};
