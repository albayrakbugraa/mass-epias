const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config(); 
const logger = require('./utils/logger');

const apiKeyAuth = require('./middlewares/apiKeyAuth');
const validateRequestHeaders = require('./middlewares/validateRequestHeaders');
const responseMiddleware = require('./middlewares/validateResponse');


const app = express();
app.use(bodyParser.json());

app.use(validateRequestHeaders);
app.use(apiKeyAuth); // tüm /api/v1/... endpointlerine uygular
app.use(responseMiddleware);


app.use('/api/v1/subscription', require('./routes/subscription'));
app.use('/api/v1/versions', require('./routes/version'));
app.use('/api/v1/complaint', require('./routes/complaint'));
app.use('/api/v1/notifications', require('./routes/notification'));

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info('MASS EDAŞ API started', {
    port: PORT,
    env: process.env.NODE_ENV || 'dev',
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
});


process.on('uncaughtException', (err) => {
  logger.error('[UNCAUGHT_EXCEPTION]', {
    message: err.message,
    stack: err.stack
  });
  process.exit(1); // opsiyonel: crash sonrası tekrar başlatılacaksa
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[UNHANDLED_REJECTION]', {
    reason: reason,
    stack: reason?.stack
  });
  process.exit(1);
});
