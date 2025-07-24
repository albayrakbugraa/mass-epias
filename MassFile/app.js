const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const logger = require("./utils/logger");
const fs = require("fs");
dotenv.config();

const app = express();
app.use(express.json());

// Upload klasörünü .env'den almak için:
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.info("[Startup] uploads klasörü oluşturuldu", {
      uploadDir,
      env: process.env.NODE_ENV || "dev",
    });
  } else {
    logger.info("[Startup] uploads klasörü mevcut", {
      uploadDir,
      env: process.env.NODE_ENV || "dev",
    });
  }
} catch (err) {
  logger.error("[Startup] uploads klasörü oluşturulamadı!", {
    uploadDir,
    errorMessage: err.message,
    stack: err.stack,
  });
  process.exit(1);
}

// Statik dosya servis (örn: dosya indirme, CDN vs.)
app.use("/uploads", express.static(uploadDir));

// routes
const fileRouter = require("./routes/file");
app.use("/", fileRouter);

// Error logging
app.use((err, req, res, next) => {
  const correlationId = req.headers?.["x-correlation-id"];
  logger.error("[UNHANDLED_ERROR]", {
    errorMessage: err.message,
    stack: err.stack,
    correlationId,
  });
  res.status(err.status || 500).json({
    status: err.status || 500,
    correlationId,
    errors: [{ errorCode: "internal-error", errorMessage: err.message }],
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info("[Startup] MassFile API started", {
    port: PORT,
    env: process.env.NODE_ENV || "dev",
    nodeVersion: process.version,
    uploadDir,
    timestamp: new Date().toISOString(),
  });
});

// Process crash/catch
process.on("uncaughtException", (err) => {
  logger.error("[UNCAUGHT_EXCEPTION]", {
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("[UNHANDLED_REJECTION]", {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason?.stack,
  });
  process.exit(1);
});
