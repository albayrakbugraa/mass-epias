FROM node:18-slim

# Gerekli sistem bağımlılıklarını kur
RUN apt-get update && apt-get install -y \
    libaio1 \
    unzip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Oracle Instant Client için dizin oluştur
ENV ORACLE_HOME=/opt/oracle/instantclient
RUN mkdir -p $ORACLE_HOME

# Oracle Instant Client indir ve kur
WORKDIR $ORACLE_HOME
RUN curl -L -o instantclient.zip https://download.oracle.com/otn_software/linux/instantclient/19800/instantclient-basiclite-linux.x64-19.8.0.0.0dbru.zip \
    && unzip instantclient.zip \
    && rm instantclient.zip

# Oracle Instant Client kütüphanelerini ldconfig ile tanıt
RUN echo $ORACLE_HOME > /etc/ld.so.conf.d/oracle-instantclient.conf \
    && ldconfig

# oracledb bazı versiyonlarda /lib/libclntsh.so arar – symbolic link oluştur
RUN mkdir -p $ORACLE_HOME/lib \
    && ln -s $ORACLE_HOME/libclntsh.so $ORACLE_HOME/lib/libclntsh.so

# Ortam değişkenleri
ENV PATH=$ORACLE_HOME:$PATH
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient
ENV PATH=$PATH:/opt/oracle/instantclient


# Uygulama dizini
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

# Dosya yükleme klasörü
RUN mkdir -p /usr/src/app/uploads

EXPOSE 8980
CMD ["node", "app.js"]
