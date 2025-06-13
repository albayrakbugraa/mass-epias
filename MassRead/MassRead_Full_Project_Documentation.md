
# MassRead Projesi - Tüm Modüler Yapı ve Servis Dokümantasyonu

## 1. Genel Bakış

MassRead, EPİAŞ verilerinin işlenmesi ve kurum içi sistemlere entegre edilmesi amacıyla geliştirilen bir Node.js uygulamasıdır. Bu uygulama, API Key ile korunan REST API uç noktaları sağlar ve Oracle veritabanına kayıt işlemleri gerçekleştirir.

---

## 2. Proje Yapısı

```
project-root/
├── app.js                      # Ana uygulama dosyası
├── routes/
│   ├── subscriptionCheck.js   # POST /subscription/check
│   ├── version.js             # GET /version
│   ├── readings.js            # Sayaç okuma uç noktası
│   ├── alerts.js              # Alarm okuma uç noktası
│   └── stats.js               # İstatistik verileri
├── middlewares/
│   └── apiKeyAuth.js                # API Key doğrulama
├── services/
│   ├── ccbService.js          # CCB ile XML bazlı SOAP iletişimi
│   ├── subscriptionService.js # Abonelik bilgisi DB kaydı
├── Libs/
│   ├── Ala00Lib.js            # Özel log ve yardımcı fonksiyonlar
│   └── db.js                  # DB bağlantı ve hata yönetimi
├── controllers/
│   └── subscriptionController.js                  # CCB ilgli servisi ve db ye yazıyor
│   └── versionController.js                  # versiyonu dönen kontroller
├── utils/
│   └── hashUtil.js            # Hash fonksiyonu (API Key)
└── .env                       # Ortam değişkenleri
```

---

## 3. API Orta Katman: `auth.js`

### Görev:
- `Authorization: Bearer <token>` header'ını kontrol eder.
- `MASS_API_KEYS` tablosundan hash’li key’i kontrol eder.
- Aktif olup olmadığını doğrular.
- Uygunsa `next()` ile devam ettirir.
- `LAST_USED_DATE` kolonunu günceller.

---

## 4. Abonelik Kontrolü: `POST /subscription/check`

### Parametreler:
- `installationNumber` (zorunlu)
- `type` (zorunlu)
- `tckn` veya `vkn` (en az biri zorunlu)

### Akış:
1. XML istek hazırlanır (`ccbService`)
2. CCB sistemine gönderilir
3. XML yanıt parse edilir (`xml2js`)
4. `subscriptionService` aracılığıyla DB’ye kaydedilir (`MASS_SUBSCRIPTIONS`)
5. 200 / 404 / 500 response döner

---

## 5. Loglama Mekanizması

`Ala00Lib.js` içinde:

- `log(msg)` → stdout’a timestamp ile yazar
- `error(msg)` → stderr’e timestamp ile yazar

Tüm önemli adımlar `CorrelationId` ile izlenebilir şekilde loglanır.

---

## 6. Veritabanı Tabloları

### `MASS_API_KEYS`

| Alan            | Tip       | Açıklama                     |
|------------------|-----------|-------------------------------|
| API_KEY_ID       | NUMBER    | Primary key                  |
| HASHED_API_KEY   | VARCHAR2  | SHA256 ile hashlenmiş key    |
| IS_ACTIVE        | NUMBER(1) | 1: aktif, 0: pasif           |
| LAST_USED_DATE   | DATE      | Son kullanım zamanı          |

---

### `MASS_SUBSCRIPTIONS`

| Alan               | Tip        | Açıklama                      |
|--------------------|------------|--------------------------------|
| SUBSCRIPTION_KEY   | VARCHAR2   | CCB’den dönen anahtar         |
| INSTALLATION_NUMBER| VARCHAR2   | Tesisat numarası              |
| TYPE               | VARCHAR2(30)| Abonelik tipi                 |
| TCKN               | VARCHAR2   | T.C. Kimlik No                |
| VKN                | VARCHAR2   | Vergi No                      |
| START_DATE         | DATE       | Başlangıç tarihi              |
| LAST_CHECK_DATE    | DATE       | Son kontrol tarihi            |
| IS_ACTIVE          | NUMBER(1)  | Aktiflik durumu               |
| CREATED_DATE       | DATE       | Kayıt zamanı                  |

---

## 7. Ek Servisler

### `GET /version`
- Versiyon bilgisi döner.
- Sağlık testi için kullanılabilir.

### `readings.js`, `alerts.js`, `stats.js`
- Sayaç, uyarı, istatistik uç noktaları için yapılandırılmış yer tutucular.
- Her biri ileride `ccbService` ve DB bağlantıları ile genişletilecek.

---

## 8. Hatalar ve Yönetimi

| Kod  | Açıklama                          |
|------|-----------------------------------|
| 401  | Authorization header eksik        |
| 403  | API Key geçersiz/pasif            |
| 422  | Eksik parametre                   |
| 500  | Sistemsel hata (parse, DB, XML)   |

---

## 9. Ortam Değişkenleri (.env)

```env
DB_USER=...
DB_PASSWORD=...
DB_CONNECT_STRING=10.41.128.57/EDCBIKDB
PORT=8976
```

---

## 10. Sonuç

Bu yapı, modüler, izlenebilir ve sürdürülebilir bir servis altyapısı sunar. Genişletilebilir servis katmanları ile API uç noktaları kolayca entegre edilebilir.

---

## Doküman Güncelleme

Oluşturulma tarihi: 2025-06-03 12:41:33
