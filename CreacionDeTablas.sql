-- Tipos de enumumerados
CREATE TYPE tipoPartida AS ENUM ('publica', 'privada');
CREATE TYPE estadoPartida AS ENUM ('en_curso', 'terminada');
CREATE TYPE bandoGanador AS ENUM ('lobos', 'aldeanos');
CREATE TYPE resultadoPartida AS ENUM ('ganada', 'perdida');
CREATE TYPE roles AS ENUM ('lobo', 'aldeano', 'vidente', 'bruja', 'cazador');

-- Tabla Usuario
CREATE TABLE Usuario (
  idUsuario SERIAL PRIMARY KEY, /* El idUsuario se irá autoincrementando sin necesidad de hacerlo manualmente */
  nombre VARCHAR(100) NOT NULL,
  avatar VARCHAR(255),
  hashContrasena VARCHAR(255) NOT NULL,
  correo VARCHAR(100) NOT NULL UNIQUE, /* El correo debe ser único */
  /* Fecha de creación de usuario, se pondrá automáticamente al insertar un usuario en la tabla */
  fechaCreacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Partida
CREATE TABLE Partida (
  idPartida SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, /* Al crearla se pone por defecto el tiempo actual */
  tipo tipoPartida NOT NULL, /* La columna tipo solo puede contener los valores 'publica' o 'privada' */
  hashContrasena VARCHAR(255) DEFAULT NULL, /* Solo se especificará contraseña en el caso de que la partida sea privada */
  estado estadoPartida NOT NULL DEFAULT 'en_curso', /* Por defecto 'en curso' */
  ganadores bandoGanador DEFAULT NULL /* Al crear la partida aún no se sabrá el ganador, no hasta que termine la partida */
);

-- Tabla Amistad (relación entre dos usuarios)
CREATE TABLE Amistad (
  idUsuario1 INT NOT NULL, /* idUsuario1 e idUsuario2 forman la clave primaria compuesta */
  idUsuario2 INT NOT NULL,
  PRIMARY KEY (idUsuario1, idUsuario2), /* Clave primaria compuesta */
  FOREIGN KEY (idUsuario1) REFERENCES Usuario(idUsuario) /* Clave foránea que referencia a la tabla Usuario */
    ON DELETE CASCADE, /* Si se elimina la fila del usuario1 se eliminarán también todas las relaciones de amistad que tenga ese usuario */
  FOREIGN KEY (idUsuario2) REFERENCES Usuario(idUsuario)
    ON DELETE CASCADE /* Si se elimina la fila del usuario2 se eliminarán también todas las relaciones de amistad que tenga ese usuario */
);

-- Tabla Juega (relación entre usuarios y partidas)
CREATE TABLE Juega (
  idUsuario INT NOT NULL,
  idPartida INT NOT NULL,
  rolJugado roles NOT NULL, /* Rol que está jugando el usuario */
  resultado resultadoPartida, /* El resultado de la partida puede tener los valores 'ganada' o 'perdida' */
  PRIMARY KEY (idUsuario, idPartida), /* Clave primaria compuesta de idUsuario e idPartida */
  FOREIGN KEY (idUsuario) REFERENCES Usuario(idUsuario) /* Clave foránea que referencia a la tabla Usuario */
    ON DELETE CASCADE, /* Si se elimina la fila del usuario, se eliminarán también todas las filas de Juega que tenga ese usuario */
  FOREIGN KEY (idPartida) REFERENCES Partida(idPartida) /* Clave foránea que referencia a la tabla Partida */
    ON DELETE CASCADE /* Si se elimina la fila de la partida, se eliminarán también todas las filas de Juega que tenga esa partida */
);

-- Tabla SolicitudAmistad (relación entre dos usuarios)
CREATE TABLE SolicitudAmistad (
  idUsuarioEmisor INT NOT NULL, /* El usuario que envía la solicitud */
  idUsuarioReceptor INT NOT NULL, /* El usuario que recibe la solicitud */
  fechaSolicitud TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, /* Fecha en la que se envía la solicitud */
  PRIMARY KEY (idUsuarioEmisor, idUsuarioReceptor), /* Clave compuesta de los dos id de usuario */
  FOREIGN KEY (idUsuarioEmisor) REFERENCES Usuario(idUsuario) /* Clave foránea que referencia a la tabla Usuario */
    ON DELETE CASCADE, /* Si se elimina la fila del usuario emisor, se eliminarán también todas las solicitudes de amistad de ese usuario */
  FOREIGN KEY (idUsuarioReceptor) REFERENCES Usuario(idUsuario)
    ON DELETE CASCADE /* Si se elimina la fila del usuario receptor, se eliminarán también todas las solicitudes de amistad de ese usuario */
);
