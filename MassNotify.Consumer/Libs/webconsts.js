// Libs/webconsts.js

// .env dosyasındaki değişkenleri yükle (webconsts.js dosyası da bağımsız çalışabilir düşüncesiyle buraya da eklendi)
// Ancak genelde dotenv yüklemesi ana uygulama dosyasında (app.js/index.js) yapılır ve diğer modüller process.env'e erişir.
// Burada dotenv'i yüklemek, bu dosyanın doğrudan require edildiği her yerde çalışmasını sağlar.
require('dotenv').config();

// ... (Diğer tanımlamalar) ...

module.exports = Object.freeze({
    // ... (CrmServisInfos, SmsServisInfos, logs, db, ldap, query tanımlamaları aynı kalır) ...

    oracleLib : {
        // Oracle Instant Client kütüphanesinin yolu, .env dosyasından geliyor
        dev: process.env.ORACLE_CLIENT_LIB_DIR || '/usr/local/oracle/instantclient_19_8' // Varsayılan bir değer de eklenebilir
    },
    // ... (AuthRolesUsers, roles, rds, testNumbersLong, testNumbersShort, UserInfo tanımlamaları aynı kalır) ...
});