# Backend

Este es el repositorio del servidor Backend de nuestra organización. La aplicación está construida con **Node.js** y utiliza **PostgreSQL** y **Redis** como servicios de base de datos y caché, respectivamente.

## Requisitos previos

Antes de empezar, asegúrate de contar con los siguientes requisitos:

- **Node.js**: Si no lo tienes instalado, descárgalo e instálalo desde [Node.js](https://nodejs.org/). Se recomienda la versión LTS.
  Para verificar si tienes Node.js instalado, ejecuta el siguiente comando en tu terminal o línea de comandos:

  ```bash
  node -v
  ```

  Si Node.js está instalado, debería mostrar la versión.

- **npm** (v9.x o superior recomendado). [Enlace de descarga](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

- **PostgreSQL** (enlace de base de datos PostgreSQL requerido). Recomendamos: https://neon.tech/

- **Redis** (enlace de Redis requerido). Recomendamos: https://upstash.com/

- **Git**: Asegúrate de tener **Git** instalado para poder clonar el repositorio. Puedes descargarlo desde [Git](https://git-scm.com/).

  Para verificar si tienes Git instalado, ejecuta el siguiente comando en la terminal:

  ```bash
  git --version
  ```

  Si Git está instalado, debería mostrar la versión.

## Instalación

Sigue estos pasos para clonar el proyecto y configurarlo en tu máquina local:

1. **Clonar el repositorio:**

   En la terminal o línea de comandos, navega al directorio donde deseas clonar el proyecto y ejecuta:

   ```bash
   git clone https://github.com/UNIZAR-30226-2025-08/Backend.git
   ```

   Esto descargará el repositorio completo en una carpeta llamada `Backend`.

2. **Navegar al directorio del proyecto:**

   Cambia al directorio donde se descargó el proyecto:

   ```bash
   cd Backend
   ```

3. **Instalar las dependencias:**

   Ejecuta el siguiente comando para instalar todas las dependencias del proyecto:

   ```bash
   npm install
   ```

   Este comando descargará las bibliotecas necesarias para el funcionamiento del proyecto.

   **Nota:** Si no tienes `npm` (Node Package Manager), es probable que Node.js no esté instalado correctamente. Asegúrate de seguir el paso de instalación de Node.js antes de continuar.

## Configuración inicial

Antes de iniciar el servidor, es necesario crear un archivo .env en la raíz del proyecto.
Este archivo contiene las variables de entorno necesarias para conectarse a las bases de datos.

Puedes solicitar una copia del archivo .env a cualquier miembro del equipo de Backend.

Contenido mínimo esperado en .env:

```bash
 DATABASE_URL='postgresql://usuario:password@host:puerto/base_de_datos'
 REDIS_URL='redis://usuario:password@host:puerto'
```

## Ejecución del servidor

Después de instalar las dependencias, puedes ejecutar el Backend localmente con el siguiente comando:

```bash
npm start
```

o directamente:

```bash
node server.js
```

Esto iniciará el servidor Backend localmente, y podrás ver en la terminal que se inicia correctamente.
El servidor se iniciará en el puerto configurado (por defecto 5000).

## Comandos disponibles

- Iniciar el servidor

```bash
npm start
```

- Ejecutar todos los tests

```bash
npm test
```

- Ejecutar tests de endpoints o rutas

```bash
npm test -- "tests/routes.test.js"
```

- Ejecutar tests de la clase Partida

```bash
npm test -- "tests/partida.test.js"
```

- Generar documentación JSDoc del backend

```bash
npm run docs
```

Esto generará la documentación en una carpeta llamada docs/ (según la configuración de jsdoc.json).

## Solución de problemas

1. **Node.js no está instalado o no se reconoce el comando `npm`**:

   - Asegúrate de que Node.js esté correctamente instalado.
   - Si acabas de instalar Node.js, reinicia tu terminal o línea de comandos para que los cambios surtan efecto.

2. **Errores de dependencias**:

   - Intenta ejecutar `npm install` nuevamente para asegurarte de que todas las dependencias estén correctamente instaladas.
   - Si sigue habiendo problemas, prueba eliminando la carpeta `node_modules` y ejecutando `npm install` otra vez.

3. **Servidor no se inicia**:

   - Asegúrate de que no haya otro servicio corriendo en el puerto 5000. Si es necesario, detén otros servidores o cambia el puerto en el fichero server.js.
   - Revisa si el firewall o el antivirus está bloqueando la ejecución de Node.js o el puerto en uso.

## Recursos adicionales

- [Documentación Node.js](https://nodejs.org/docs/latest/api/)
- [Guía sobre cómo clonar repositorios con Git](https://docs.github.com/es/repositories/creating-and-managing-repositories/cloning-a-repository)
