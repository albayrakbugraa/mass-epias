//nvm use v18.4.0;node app.js
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const apiKeyAuth = require('./middlewares/apiKeyAuth');
const validateRequestHeaders = require('./middlewares/validateRequestHeaders');
const responseMiddleware = require('./middlewares/validateResponse');


dotenv.config();
const app = express();
app.use(bodyParser.json());

app.use(validateRequestHeaders);
app.use(apiKeyAuth); // tüm /api/v1/... endpointlerine uygular
app.use(responseMiddleware);


app.use('/api/v1/subscription', require('./routes/subscriptionCheck'));
app.use('/api/v1/versions', require('./routes/version'));
app.use('/api/v1/readings', require('./routes/readings'));
app.use('/api/v1/alerts', require('./routes/alerts'));
app.use('/api/v1/stats', require('./routes/stats'));

const PORT = process.env.PORT || 8976;
app.listen(PORT, () => {
  console.log(`MASS EDAŞ API running on port ${PORT}`);
});
