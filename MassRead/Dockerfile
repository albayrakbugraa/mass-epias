# sudo docker rm AlaServer
# sudo docker rmi local:BIKSS_BACKEND_PRD

# cp 'Dockerfile BIKSS_BACKEND_PRD' Dockerfile

# sudo docker image build --tag local:BIKSS_BACKEND_PRD .
# sudo docker run -d -v AlaStorage:/BIKS_BACKEND/storage -v AlaDownload:/BIKS_BACKEND/upload --network AlaNetwork --name AlaServer local:BIKSS_BACKEND_PRD



# sudo docker run -i -t -p 1976:1976 --rm cc1460931dbe2f36ee90

# rsync -avz --exclude=node_modules ./dataserver/ oracle_bi@10.41.128.56:BIKSS/backend/

# sudo docker run -i -t -v AlaStorage:/BIKS_BACKEND/storage  -v AlaDownload:/BIKS_BACKEND/upload --network AlaNetwork  --name AlaServer local:BIKSS_BACKEND_PRD

# sudo docker run -t -p 8976:8976 --network AlaNetwork --name MassRead local:MASS_READ
# sudo docker run -t -p 8976:8976 --network AlaNetwork --name MassRead local:MASS_READ

# cp Dockerfile Dockerfile_tmp
# cp 'Dockerfile BIKSS_BACKEND_PRD' Dockerfile


FROM local:ALA_BASE_IMG

LABEL maintainer='Kemal Onyurt <onyurt@gmail.com> Alatus Ltd.'
LABEL description='BIKSS Bildirimsiz kesintilere sms gönderim sistemi BACKEND PROD'  
ENV TZ=Europe/Istanbul
# Copy the rest of the app code to the container
COPY . .

CMD exec node app.js
