#!/bin/bash

# Parar y borrar contenedor del backend
docker stop backend >/dev/null 2>&1 && docker rm backend >/dev/null 2>&1

# Borrar imagen del backend
docker rmi backend  >/dev/null 2>&1
