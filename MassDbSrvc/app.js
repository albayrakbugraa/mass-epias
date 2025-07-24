require("dotenv").config(); // .env'den ortam değişkenlerini oku
const cors = require("cors");
const express = require("express");
const db = require("./db");
const logger = require('./utils/logger');


const app = express();

const allowedOrigins = [
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
];

app.use(express.json());

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        logger.warn("[CORS] Reddedildi", { origin });
        return callback(new Error("CORS policy hatası"), false);
      }
    },
  })
);

const subscriptionRouter = require("./routes/subscription");
const complaintRouter = require("./routes/complaint");
const authRouter = require("./routes/auth");
const webhookRoutes = require('./routes/webhook');

//Routes
app.use("/auth", authRouter);
app.use("/subscription", subscriptionRouter);
app.use("/complaint", complaintRouter);
app.use('/notifications', webhookRoutes);

const port = process.env.PORT || 3000;

db.initialize()
  .then(() => {
    app.listen(port, () => {
      logger.info("[Startup] MassDbSrvc started", {
        port,
        env: process.env.NODE_ENV || "dev",
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
      });
    });
  })
  .catch((err) => {
    logger.error("[Startup] Veritabanı bağlantı hatası", {
      errorMessage: err.message,
      stack: err.stack,
    });
    process.exit(1);
  });

const shutdown = async (signal) => {
  logger.info(`[Shutdown] ${signal} alındı, DB pool kapanıyor...`);
  try {
    await db.closePool();
    logger.info("[Shutdown] DB pool kapatıldı, process exit(0)");
    process.exit(0);
  } catch (err) {
    logger.error("[Shutdown] DB pool kapatılırken hata", {
      errorMessage: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
