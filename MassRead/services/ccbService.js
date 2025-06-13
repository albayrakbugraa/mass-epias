const xml2js = require('xml2js');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const mLib = require('../Libs/Ala00Lib');

const CCB_SOAP_ENDPOINT = process.env.CCB_SOAP_ENDPOINT || 'https://10.41.67.200:6501/ouaf/XAIApp/xaiserver/CMSUBSCHECK';
const CCB_DEBUG_USER = process.env.CCB_USER || 'DEBUGUSER';
const CCB_DEBUG_PASS = process.env.CCB_PASS || 'DEBUGUSER00';

const xmlBuilder = new xml2js.Builder({ headless: true });

function buildSubscriptionCheckXml({ installationNumber, type, tckn, vkn }) {
    const requestBody = {
        'cms:CMSUBSCHECK': {
            'cms:subscriptionCheckRequest': {
                'cms:vkn': vkn || null,
                'cms:tckn': tckn || null,
                'cms:installationNumber': installationNumber,
                'cms:type': type
            }
        }
    };

    const innerXml = xmlBuilder.buildObject(requestBody);
    return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cms="http://oracle.com/CMSUBSCHECK.xsd">
        <soapenv:Header/>
        <soapenv:Body>
            ${innerXml}
        </soapenv:Body>
    </soapenv:Envelope>`;
}

async function callCcb(xmlRequest, correlationId) {
    const authHeader = 'Basic ' + Buffer.from(`${CCB_DEBUG_USER}:${CCB_DEBUG_PASS}`).toString('base64');

    const headers = {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': '',
        'X-Request-ID': uuidv4(),
        'X-Correlation-ID': correlationId,
        'Authorization': authHeader
    };

    const agent = new https.Agent({ rejectUnauthorized: false });

    try {
        const response = await axios.post(CCB_SOAP_ENDPOINT, xmlRequest, {
            headers,
            httpsAgent: agent
        });

        return response.data;
    } catch (err) {
        mLib.error(`[CCB Servisi] SOAP çağrısı başarısız: ${err.message}`);
        throw err;
    }
}

module.exports = {
    buildSubscriptionCheckXml,
    callCcb
};