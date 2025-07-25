CREATE TABLE MASS_COMPLAINTS (
    COMPLAINT_ID          VARCHAR2(32 CHAR) NOT NULL,   
    SUBSCRIPTION_KEY      VARCHAR2(100 CHAR) NOT NULL,
    CATEGORY              VARCHAR2(256 CHAR) NOT NULL,
    SUB_CATEGORY          VARCHAR2(256 CHAR),
    CONTENT               VARCHAR2(2048 CHAR) NOT NULL,
    STATUS                VARCHAR2(32 CHAR) DEFAULT 'inReview' NOT NULL,
    CREATED_AT            TIMESTAMP(6) WITH LOCAL TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
    UPDATED_AT            TIMESTAMP(6) WITH LOCAL TIME ZONE,
    IS_ACTIVE             NUMBER(1) DEFAULT 1 NOT NULL

    CONSTRAINT PK_MASS_COMPLAINTS PRIMARY KEY (COMPLAINT_ID),
    CONSTRAINT FK_COMPLAINT_TO_SUBS FOREIGN KEY (SUBSCRIPTION_KEY)
        REFERENCES MASS_SUBSCRIPTIONS(SUBSCRIPTION_KEY) ON DELETE CASCADE
);

-- Yorumlar
COMMENT ON TABLE MASS_COMPLAINTS IS 'MASS sisteminde kullanıcı şikayetlerini tutar.';
COMMENT ON COLUMN MASS_COMPLAINTS.COMPLAINT_ID IS 'Şikayet için benzersiz ID.';
COMMENT ON COLUMN MASS_COMPLAINTS.SUBSCRIPTION_KEY IS 'Bağlı abonelik.';
COMMENT ON COLUMN MASS_COMPLAINTS.CATEGORY IS 'Şikayet ana kategorisi.';
COMMENT ON COLUMN MASS_COMPLAINTS.SUB_CATEGORY IS 'Alt kategori (opsiyonel).';
COMMENT ON COLUMN MASS_COMPLAINTS.CONTENT IS 'Şikayet açıklaması.';
COMMENT ON COLUMN MASS_COMPLAINTS.STATUS IS 'Durum: inReview, resolved...';
COMMENT ON COLUMN MASS_COMPLAINTS.CREATED_AT IS 'Oluşturulma zamanı.';
COMMENT ON COLUMN MASS_COMPLAINTS.UPDATED_AT IS 'Güncellenme zamanı.';
COMMENT ON COLUMN MASS_COMPLAINTS.IS_ACTIVE IS 'Şikayet için aktif/pasif durumu.';
