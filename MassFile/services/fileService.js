const axios = require('axios');
const MASS_DB_SRVC_URL = process.env.MASS_DB_SRVC_URL; // .env'den gelsin

async function getUploadInfo(fileId) {
    try {
      // MassDbSrvc'nin endpointine HTTP GET isteği atılır
      const resp = await axios.get(`${MASS_DB_SRVC_URL}/complaint/file/info/${fileId}`);
      return resp.data; // Beklenen: { FILE_ID, NAME, UPLOAD_EXPIRES_AT, IS_UPLOADED, ... }
    } catch (err) {
      // Eğer 404 gelirse null dön, diğer hatalarda hata fırlat
      if (err.response && err.response.status === 404) return null;
      throw err;
    }
  }
