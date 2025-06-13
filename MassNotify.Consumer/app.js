const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const apiKeyAuth = require('./middlewares/apiKeyAuth');
const validateRequestHeaders = require('./middlewares/validateRequestHeaders');
const responseMiddleware = require('./middlewares/validateResponse');

dotenv.config();
const app = express();
app.use(bodyParser.json());

// Header doğrulama ve API key kontrol middleware
app.use(validateRequestHeaders); // X-Request-ID, X-Correlation-ID kontrolü burada olsun
app.use(apiKeyAuth); // Bearer key doğrulama burada

// Response middleware (tüm response'ları dökümandaki genel forma sokmak için)
app.use(responseMiddleware);

// Routes

app.use('/api/v1/notifications', require('./routes/outageNotificationRoute'));


const PORT = process.env.PORT || 8977;
app.listen(PORT, () => {
  console.log(`MassNotify API running on port ${PORT}`);
});
