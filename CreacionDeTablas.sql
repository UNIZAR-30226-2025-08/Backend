-- Crear el ENUM para los estados de partida
CREATE TYPE tipo_partida AS ENUM ('publica', 'privada');
CREATE TYPE estado_partida AS ENUM ('en_curso', 'terminada', 'cancelada');
CREATE TYPE bando_ganador AS ENUM ('lobos', 'aldeanos', 'empate');
CREATE TYPE resultado_partida AS ENUM ('ganada', 'perdida');


-- Tabla Usuario
CREATE TABLE Usuario (
  idUsuario SERIAL PRIMARY KEY, /*El Id Usuario se irá autoincrementando sin necesidad de hacerlo manualmente*/
  nombre VARCHAR(100) NOT NULL, /*Yo creo que no deben ser únicos pero se pueden poner como únicos si queréis*/
  avatar VARCHAR(255),  /*De momento he puesto que pueda ser nulo, pero igual en vez de ser nulo ponemos uno por defecto*/
  hashContrasena VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE, /*El Email debe ser único*/
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP /*(Opcional, ya comentareis que os parece) Fecha de creación de perfil que se pondrá automáticamente al insertar un usuario en la tabla*/
);

-- Tabla Partida
CREATE TABLE Partida (
  idPartida SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, /*Al crearla se pone por defecto el tiempo actual*/
  tipo tipo_partida NOT NULL, /*La columna tipo solo puede contener los valores 'publica' o 'privada'*/
  contrasena VARCHAR(255) DEFAULT NULL, /*He puesto Default null porque solo se especificará contraseña en el caso de que la partida sea privada*/
  estado estado_partida NOT NULL DEFAULT 'en_curso', /*He decidido poner como default 'en curso', (Se puede debatir)*/
  bando_ganador bando_ganador DEFAULT NULL /*Default null porque al crear la partida aún no se sabrá el ganador*/
);

-- Tabla Amistad
CREATE TABLE Amistad (
  idUsuario1 INT NOT NULL, /*El idUsuario1 y el idUsuario2 forman la clave primaria compuesta*/
  idUsuario2 INT NOT NULL,
  PRIMARY KEY (idUsuario1, idUsuario2), /*Clave primaria compuesta*/
  FOREIGN KEY (idUsuario1) REFERENCES Usuario(idUsuario) /*Clave foránea que referencia a la tabla Usuario*/
    ON DELETE CASCADE, /*Si se elimina la fila de el usuario 1 se eliminarán también todas las relaciones de amistad que tenga ese usuario*/
  FOREIGN KEY (idUsuario2) REFERENCES Usuario(idUsuario)
    ON DELETE CASCADE /*Si se elimina la fila del usuario 2 se eliminarán también todas las relaciones de amistad que tenga ese usuario*/
);

-- Tabla Juega (Relación entre usuarios y partidas)
CREATE TABLE Juega (
  idUsuario INT NOT NULL,
  idPartida INT NOT NULL,
  rol_jugado VARCHAR(50), /*Rol que está jugando el usuario (Se podría hacer un ENUM con todos los roles)*/
  resultado resultado_partida, /*El resultado de la partida puede tener los valores 'ganada' o 'perdida'*/
  PRIMARY KEY (idUsuario, idPartida), /*Clave primaria compuesta de idUsuario, idPartida*/
  FOREIGN KEY (idUsuario) REFERENCES Usuario(idUsuario) /*Clave foránea que referencia a la tabla Usuario*/
    ON DELETE CASCADE, /*Si se elimina la fila de el usuario, se eliminarán también todas las filas de juega que tenga ese usuario*/
  FOREIGN KEY (idPartida) REFERENCES Partida(idPartida) /*Clave foránea que referencia a la tabla Partida*/
    ON DELETE CASCADE /*Si se elimina la fila de la partida, se eliminarán también todas las filas de juega que tenga esa partida*/
);

/*La de solicitudes de amistad la pongo pero no la tengo clara del todo*/
CREATE TABLE SolicitudAmistad (
  idUsuarioEmisor INT NOT NULL, /*El usuario que envía la solicitud*/
  idUsuarioReceptor INT NOT NULL, /*El usuario que recibe la solicitud*/
  fecha_solicitud TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, /*No sé si haría falta*/
  PRIMARY KEY (idUsuarioEmisor, idUsuarioReceptor), /*Clave compuesta de los id de usuario que se mandan la solicitud*/
  FOREIGN KEY (idUsuarioEmisor) REFERENCES Usuario(idUsuario) /*Clave foránea que referencia a la tabla Usuario*/
    ON DELETE CASCADE, /*Si se elimina la fila de el usuario emisor, se eliminarán también todas las solicitudes de amistad de ese usuario*/
  FOREIGN KEY (idUsuarioReceptor) REFERENCES Usuario(idUsuario)
    ON DELETE CASCADE /*Si se elimina la fila del usuario receptor, se eliminarán también las solicitudes de amistad que hayan hecho esos usuarios*/
);
