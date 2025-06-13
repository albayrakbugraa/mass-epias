project-root/
│
├── app.js                        # Ana uygulama dosyası
├── routes/
│   └── subscriptionCheck.js     # POST /subscription/check mantığı
│   └── version.js               # GET /versions mantığı
├── middlewares/
│   └── auth.js                  # API Key doğrulama middleware
├── services/
│   └── ccbService.js            # CCB SOAP çağrısı ve XML işleme
│   └── subscriptionService.js   # Abonelik kayıt işlemleri (DB)
│
├── Libs/
│   └── Ala00Lib.js
│   └── db.js
│
└── .env

