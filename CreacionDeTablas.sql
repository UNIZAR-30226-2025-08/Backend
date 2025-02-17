CREATE TABLE Usuario (
  idUsuario INT AUTO_INCREMENT PRIMARY KEY, /*El Id Usuario se ira autoincrementando sin necesidad de hacerlo manualmente*/
  nombre VARCHAR(100) NOT NULL, /*Yo creo que no deben ser únicos pero se pueden poner como únicos si queréis*/
  avatar VARCHAR(255),  /*De momento he puesto que pueda ser nulo, pero igual en vez de ser nulo ponemos uno por defecto*/
  hashContrasena VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE, /*El Email debe ser único*/
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP /*(Opcional, ya comentareis que os parece) Fecha de creación de perfil que se pondrá automáticamente al insertar un usuario en la tabla*/
);

CREATE TABLE Partida (
  idPartida INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, /*Al crearla se pone por defecto el tiempo actual*/
  tipo ENUM('publica','privada') NOT NULL, /*La columna tipo solo puede contener los valores 'publica' o 'privada'*/ 
  contrasena VARCHAR(255) DEFAULT NULL,/*He puesto Default null porque solo se especificará contraña en el caso de que la partida sea privada*/
  estado ENUM('en_curso','terminada','cancelada') NOT NULL DEFAULT 'en_curso', /*He decidido poner como default en curso,(Se puede debatir)*/
  bando_ganador ENUM('lobos','aldeanos','empate') DEFAULT NULL /*Default null porque al crear la partida aún no se sabrá el ganador*/
);

CREATE TABLE Amistad (
  idUsuario1 INT NOT NULL, /*El idUsuario1 y el idUsuario2 forman la clave primaria compuesta*/
  idUsuario2 INT NOT NULL,
  PRIMARY KEY (idUsuario1, idUsuario2), /*Clave primaria compuesta*/
  FOREIGN KEY (idUsuario1) REFERENCES Usuario(idUsuario) /*Clave foránea que referencia a la tabla Usuario*/
    ON DELETE CASCADE /*Si se elimina la fila de el usuario 1 se eliminará también todas las relaciones de amistades que tenga ese usuario*/
  FOREIGN KEY (idUsuario2) REFERENCES Usuario(idUsuario)
    ON DELETE CASCADE /*Si se elimina la fila de el usuario 2 se eliminará también todas las relaciones de amistades que tenga ese usuario*/
);

CREATE TABLE Juega (
  idUsuario INT NOT NULL,
  idPartida INT NOT NULL,
  rol_jugado VARCHAR(50), /*Rol que esta jugando el usuario(Se podría hacer un enum con todos los roles)*/
  resultado ENUM('ganada','perdida'), /*El resultado de la partida puede tener los valores ganada o perdida*/
  PRIMARY KEY (idUsuario, idPartida),/*Clave primaria compuesta de idUsuario, idPartida*/
  FOREIGN KEY (idUsuario) REFERENCES Usuario(idUsuario) /*Clave foránea que referencia a la tabla Usuario*/
    ON DELETE CASCADE /*Si se elimina la fila de el usuario se eliminará también todas las filas de juega que tenga ese usuario*/
  FOREIGN KEY (idPartida) REFERENCES Partida(idPartida) /*Clave foránea que referencai a la tabla Partida*/
    ON DELETE CASCADE /*Si se elimina la fila de la partida se eliminará también todas las filas de juega que tenga esa partida*/
);

/*La de solicitudes de amistad la pongo pero no la tengo clara del todo*/
CREATE TABLE SolicitudAmistad (
  idUsuarioEmisor INT NOT NULL, /*El usuario que envía la solicitud*/
  idUsuarioReceptor INT NOT NULL, /*El usuario que recibe la solicitud*/
  estado ENUM('pendiente', 'aceptada', 'rechazada') NOT NULL DEFAULT 'pendiente', /*El estado de la solicitud puede ser pendiente(default), aceptada o rechazada*/
  fecha_solicitud DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, /*No sé si haría falta*/
  PRIMARY KEY (idUsuarioEmisor, idUsuarioReceptor),/*Clave compuesta de los id de usuario que se mandan la solicitud*/
  FOREIGN KEY (idUsuarioEmisor) REFERENCES Usuario(idUsuario) /*Clave foránea que referencia a la tabla Usuario*/
    ON DELETE CASCADE, /*Si se elimina la fila de el usuario emisor se eliminará también todas las solicitudes de amistad de ese usuario*/
    FOREIGN KEY (idUsuarioReceptor) REFERENCES Usuario(idUsuario)
    ON DELETE CASCADE /*Si se elimina la fila de usuario receptor se eliminaran también las solicitudes de amistad que hayan hecho esos usuarios*/
);




