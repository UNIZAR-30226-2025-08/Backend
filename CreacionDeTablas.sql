-- Crear el ENUM para los estados de partida
CREATE TYPE tipo_partida AS ENUM ('publica', 'privada');
CREATE TYPE estado_partida AS ENUM ('en_curso', 'terminada', 'cancelada');
CREATE TYPE bando_ganador AS ENUM ('lobos', 'aldeanos', 'empate');
CREATE TYPE resultado_partida AS ENUM ('ganada', 'perdida');
CREATE TYPE estado_solicitud AS ENUM ('pendiente', 'aceptada', 'rechazada');

-- Tabla Usuario
CREATE TABLE Usuario (
  idUsuario SERIAL PRIMARY KEY,  -- ID autoincremental
  nombre VARCHAR(100) NOT NULL,
  avatar VARCHAR(255),
  hashContrasena VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Partida
CREATE TABLE Partida (
  idPartida SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tipo tipo_partida NOT NULL,
  contrasena VARCHAR(255) DEFAULT NULL,
  estado estado_partida NOT NULL DEFAULT 'en_curso',
  bando_ganador bando_ganador DEFAULT NULL
);

-- Tabla Amistad
CREATE TABLE Amistad (
  idUsuario1 INT NOT NULL,
  idUsuario2 INT NOT NULL,
  PRIMARY KEY (idUsuario1, idUsuario2),
  FOREIGN KEY (idUsuario1) REFERENCES Usuario(idUsuario) ON DELETE CASCADE,
  FOREIGN KEY (idUsuario2) REFERENCES Usuario(idUsuario) ON DELETE CASCADE
);

-- Tabla Juega (Relación entre usuarios y partidas)
CREATE TABLE Juega (
  idUsuario INT NOT NULL,
  idPartida INT NOT NULL,
  rol_jugado VARCHAR(50),
  resultado resultado_partida,
  PRIMARY KEY (idUsuario, idPartida),
  FOREIGN KEY (idUsuario) REFERENCES Usuario(idUsuario) ON DELETE CASCADE,
  FOREIGN KEY (idPartida) REFERENCES Partida(idPartida) ON DELETE CASCADE
);

-- Tabla SolicitudAmistad
CREATE TABLE SolicitudAmistad (
  idUsuarioEmisor INT NOT NULL,
  idUsuarioReceptor INT NOT NULL,
  estado estado_solicitud NOT NULL DEFAULT 'pendiente',
  fecha_solicitud TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (idUsuarioEmisor, idUsuarioReceptor),
  FOREIGN KEY (idUsuarioEmisor) REFERENCES Usuario(idUsuario) ON DELETE CASCADE,
  FOREIGN KEY (idUsuarioReceptor) REFERENCES Usuario(idUsuario) ON DELETE CASCADE
);
