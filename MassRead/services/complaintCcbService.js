const xml2js = require("xml2js");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const https = require("https");
const logger = require("../utils/logger");

const CCB_DEBUG_USER = process.env.CCB_USER || "DEBUGUSER";
const CCB_DEBUG_PASS = process.env.CCB_PASS || "DEBUGUSER00";

const xmlBuilder = new xml2js.Builder({ headless: true });
const xmlParser = new xml2js.Parser({
  explicitArray: false,
  ignoreAttrs: true,
});

