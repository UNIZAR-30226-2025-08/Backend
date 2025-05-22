#!/bin/bash

# Crear imagen del backend
docker build -t backend .

# Ejecuta el contenedor en segundo plano mapeando el puerto 443 del host con el 443 del contenedor
docker run -d --restart unless-stopped -p 443:443 --name backend -v /etc/letsencrypt:/etc/letsencrypt:ro backend
