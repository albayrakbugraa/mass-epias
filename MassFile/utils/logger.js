const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', // ENV üzerinden seviye kontrolü
  format: winston.format.json(),           // JSON formatında log
  defaultMeta: { service: process.env.SERVICE_NAME || 'MassFile' },
  transports: [
    new winston.transports.Console()       // stdout (Kibana için yeterli)
    // Dosyaya da loglamak
    // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

module.exports = logger;
