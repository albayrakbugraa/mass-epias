const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');


dotenv.config();
const app = express();
app.use(bodyParser.json());

const notificationsRouter = require('./routes/notifications');
app.use('/notification', notificationsRouter);


const PORT = process.env.PORT || 8977;
app.listen(PORT, () => {
  console.log(`MassNotify API running on port ${PORT}`);
});
