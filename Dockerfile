# Usa una runtime oficial de Node.js muy reciente para que crypto no de problemas
FROM node:20-bullseye-slim

# Crea el directorio de la aplicación
WORKDIR /usr/src/app

# Copia package.json y package-lock.json
COPY package*.json ./

# Actualiza los repositorios e instala curl
RUN apt-get update && apt-get install -y curl

# Configura el repositorio de Node.js 20.x a través de Nodesource
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Instala Node.js
RUN apt-get install -y nodejs

RUN npm install socket.io@latest

# Instala las dependencias del proyecto
RUN npm install

# Copia el resto del código de la aplicación
COPY . .

# Expone el puerto 443
EXPOSE 443

# Inicia el servidor
CMD ["node", "server.js"]
